package com.flipcount.service;

import com.flipcount.dto.DealRequest;
import com.flipcount.entity.*;
import com.flipcount.repository.DealRepository;
import com.flipcount.repository.ProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

@Service
public class DealService {

    private final DealRepository deals;
    private final ProfileRepository profiles;
    private final FormulaService formulaService;
    private final CraftService craftService;

    public DealService(DealRepository deals,
                       ProfileRepository profiles,
                       FormulaService formulaService,
                       CraftService craftService) {
        this.deals = deals;
        this.profiles = profiles;
        this.formulaService = formulaService;
        this.craftService = craftService;
    }

    public Deal create(String email, DealRequest req) {
        Profile profile = profiles.findById(req.getProfileId())
                .orElseThrow(() -> new IllegalArgumentException("Профиль не найден"));

        if (!profile.getUser().getEmail().equals(email))
            throw new IllegalArgumentException("Нет доступа к этому профилю");

        Formula formula;
        if (req.getFormulaId() != null) {
            formula = formulaService.getOne(email, req.getFormulaId());
        } else {
            formula = formulaService.getActive(email);
            if (formula == null)
                throw new IllegalArgumentException("Нет активной формулы");
        }

        int multiplier = req.getMultiplier() != null && req.getMultiplier() > 0
                ? req.getMultiplier() : 1;

        BigDecimal profit;

        if (Boolean.TRUE.equals(formula.getIsCraft()) && formula.getCraftId() != null) {
            Craft craft = craftService.getOne(email, formula.getCraftId());
            profit = calculateCraftProfit(craft, req.getValues(), multiplier);
        } else {
            profit = calculateProfit(formula.getExpression(), req.getValues());
        }

        Deal deal = Deal.builder()
                .buyPrice(getValue(req.getValues(), "A"))
                .sellPrice(getValue(req.getValues(), "B"))
                .profit(profit)
                .formulaUsed(formula.getName())
                .profile(profile)
                .build();

        return deals.save(deal);
    }

    private BigDecimal getValue(Map<String, BigDecimal> values, String key) {
        return (values != null && values.get(key) != null)
                ? values.get(key)
                : BigDecimal.ZERO;
    }

    /**
     * Расчёт прибыли по крафту.
     * multiplier — сколько крафтов делается за раз.
     * salePoint — узел с флагом isSalePoint и ценой salePrice.
     * quantity на стрелке к salePoint = сколько единиц продаём.
     */
    private BigDecimal calculateCraftProfit(Craft craft,
                                            Map<String, BigDecimal> values,
                                            int multiplier) {

        CraftNode saleNode = craft.getNodes().stream()
                .filter(n -> Boolean.TRUE.equals(n.getIsSalePoint()))
                .findFirst()
                .orElse(null);

        if (saleNode == null || saleNode.getSalePrice() == null) {
            return BigDecimal.ZERO;
        }

        // Сколько единиц продаём — берём quantity из стрелки к точке продажи
        int saleQuantity = craft.getEdges().stream()
                .filter(e -> e.getToNodeId().equals(saleNode.getId()))
                .map(CraftEdge::getQuantity)
                .findFirst()
                .orElse(1);

        int produced = multiplier;
        int actualSold = Math.min(produced, saleQuantity);

        // Выручка: цена продажи × сколько реально продали
        BigDecimal revenue = saleNode.getSalePrice()
                .multiply(BigDecimal.valueOf(actualSold));

        // Затраты: цена покупки каждого материала × введённое значение × multiplier
        BigDecimal costs = BigDecimal.ZERO;
        for (CraftNode node : craft.getNodes()) {
            if (Boolean.TRUE.equals(node.getIsSalePoint())) continue;
            if (node.getItemPrice() == null) continue;

            BigDecimal val = values != null
                    ? values.getOrDefault(node.getVariable(), BigDecimal.ZERO)
                    : BigDecimal.ZERO;

            costs = costs.add(
                    node.getItemPrice()
                            .multiply(val)
                            .multiply(BigDecimal.valueOf(multiplier))
            );
        }

        return revenue.subtract(costs).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateProfit(String expression, Map<String, BigDecimal> values) {
        if (expression == null || values == null) return BigDecimal.ZERO;

        String cleanExpr = expression.split("=")[0].trim();
        String replaced = cleanExpr;

        for (Map.Entry<String, BigDecimal> entry : values.entrySet()) {
            replaced = replaced.replaceAll("\\b" + entry.getKey() + "\\b",
                    entry.getValue().toString());
        }

        replaced = replaced.replace("×", "*")
                .replace("÷", "/")
                .replace("−", "-")
                .replace("—", "-");

        try {
            double result = eval(replaced);
            return BigDecimal.valueOf(result).setScale(2, RoundingMode.HALF_UP);
        } catch (Exception e) {
            throw new IllegalArgumentException("Ошибка в формуле: " + e.getMessage());
        }
    }

    private double eval(final String str) {
        return new Object() {
            int pos = -1, ch;

            void nextChar() {
                ch = (++pos < str.length()) ? str.charAt(pos) : -1;
            }

            boolean eat(int charToEat) {
                while (ch == ' ') nextChar();
                if (ch == charToEat) {
                    nextChar();
                    return true;
                }
                return false;
            }

            double parse() {
                nextChar();
                double x = parseExpression();
                if (pos < str.length()) throw new RuntimeException("Неожиданный символ: " + (char) ch);
                return x;
            }

            double parseExpression() {
                double x = parseTerm();
                for (;;) {
                    if (eat('+')) x += parseTerm();
                    else if (eat('-')) x -= parseTerm();
                    else return x;
                }
            }

            double parseTerm() {
                double x = parseFactor();
                for (;;) {
                    if (eat('*')) x *= parseFactor();
                    else if (eat('/')) x /= parseFactor();
                    else return x;
                }
            }

            double parseFactor() {
                if (eat('+')) return parseFactor();
                if (eat('-')) return -parseFactor();

                double x;
                int startPos = this.pos;
                if (eat('(')) {
                    x = parseExpression();
                    eat(')');
                } else if ((ch >= '0' && ch <= '9') || ch == '.') {
                    while ((ch >= '0' && ch <= '9') || ch == '.') nextChar();
                    x = Double.parseDouble(str.substring(startPos, this.pos));
                } else {
                    throw new RuntimeException("Неожиданный символ: " + (char) ch);
                }
                return x;
            }
        }.parse();
    }

    public List<Deal> listByProfile(String email, Long profileId) {
        Profile profile = profiles.findById(profileId)
                .orElseThrow(() -> new IllegalArgumentException("Профиль не найден"));
        if (!profile.getUser().getEmail().equals(email))
            throw new IllegalArgumentException("Нет доступа");
        return deals.findByProfileIdOrderByCreatedAtDesc(profileId);
    }

    public void delete(String email, Long dealId) {
        Deal deal = deals.findById(dealId)
                .orElseThrow(() -> new IllegalArgumentException("Сделка не найдена"));
        if (!deal.getProfile().getUser().getEmail().equals(email))
            throw new IllegalArgumentException("Нет доступа");
        deals.delete(deal);
    }

    @Transactional
    public void deleteBatch(String email, List<Long> ids) {
        for (Long id : ids) {
            Deal deal = deals.findById(id).orElse(null);
            if (deal == null) continue;
            if (!deal.getProfile().getUser().getEmail().equals(email)) continue;
            deals.delete(deal);
        }
    }
}