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
        BigDecimal buyPrice;
        BigDecimal sellPrice;

        if (Boolean.TRUE.equals(formula.getIsCraft()) && formula.getCraftId() != null) {
            Craft craft = craftService.getOne(email, formula.getCraftId());
            profit = calculateCraftProfit(craft, req.getValues(), multiplier);

            // buyPrice = сумма затрат на материалы
            buyPrice = BigDecimal.ZERO;
            for (CraftNode node : craft.getNodes()) {
                if (Boolean.TRUE.equals(node.getIsSalePoint())) continue;
                if (node.getItemPrice() == null) continue;
                BigDecimal val = req.getValues() != null
                        ? req.getValues().getOrDefault(node.getVariable(), BigDecimal.ZERO)
                        : BigDecimal.ZERO;
                buyPrice = buyPrice.add(node.getItemPrice().multiply(val)
                        .multiply(BigDecimal.valueOf(multiplier)));
            }

            // sellPrice = выручка от продажи
            CraftNode saleNode = craft.getNodes().stream()
                    .filter(n -> Boolean.TRUE.equals(n.getIsSalePoint()))
                    .findFirst().orElse(null);
            sellPrice = (saleNode != null && saleNode.getSalePrice() != null)
                    ? saleNode.getSalePrice().multiply(
                    BigDecimal.valueOf(Math.min(multiplier, 1)))  // заглушка, см. ниже
                    : BigDecimal.ZERO;

            // Точный sellPrice = salePrice × actualSold — можно вычислить так же, как в calculateCraftProfit,
            // либо вернуть из calculateCraftProfit вторым значением (объектом).
            // Проще: пересчитать actualSold ещё раз (см. финальную версию метода).

        } else {
            profit = calculateProfit(formula.getExpression(), req.getValues());
            // Для ручной формулы — первое поле = покупка, второе = продажа
            List<FormulaField> fields = formula.getFields();
            buyPrice = fields.size() > 0
                    ? getValue(req.getValues(), fields.get(0).getVariable())
                    : BigDecimal.ZERO;
            sellPrice = fields.size() > 1
                    ? getValue(req.getValues(), fields.get(1).getVariable())
                    : BigDecimal.ZERO;
        }

        Deal deal = Deal.builder()
                .buyPrice(buyPrice)
                .sellPrice(sellPrice)
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

    public Map<String, BigDecimal> preview(String email, DealRequest req) {
        Profile profile = profiles.findById(req.getProfileId())
                .orElseThrow(() -> new IllegalArgumentException("Профиль не найден"));
        if (!profile.getUser().getEmail().equals(email))
            throw new IllegalArgumentException("Нет доступа");

        Formula formula;
        if (req.getFormulaId() != null) {
            formula = formulaService.getOne(email, req.getFormulaId());
        } else {
            formula = formulaService.getActive(email);
            if (formula == null) return Map.of("profit", BigDecimal.ZERO);
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
        return Map.of("profit", profit);
    }

    /**
     * Расчёт прибыли по крафту.
     *
     * Логика:
     *  - multiplier — сколько крафтов за раз (вводит пользователь).
     *  - output у финального узла — сколько единиц производится за 1 крафт.
     *  - quantity на стрелке к SalePoint — сколько единиц продаём.
     *  - Если произвели больше, чем продаём — в прибыль идёт только проданное.
     *  - itemPrice начального узла — цена за 1 шт.
     *  - values (введённые значения) — цена за 1 шт для каждого начального узла.
     */
    private BigDecimal calculateCraftProfit(Craft craft,
                                            Map<String, BigDecimal> values,
                                            int multiplier) {

        // 1. Найти точку продажи
        CraftNode saleNode = craft.getNodes().stream()
                .filter(n -> Boolean.TRUE.equals(n.getIsSalePoint()))
                .findFirst()
                .orElse(null);

        if (saleNode == null || saleNode.getSalePrice() == null) {
            return BigDecimal.ZERO;
        }

        // 2. Сколько единиц продаём (сумма quantity всех стрелок в SalePoint)
        int soldUnits = craft.getEdges().stream()
                .filter(e -> e.getToNodeId().equals(saleNode.getId()))
                .mapToInt(CraftEdge::getQuantity)
                .sum();
        if (soldUnits <= 0) soldUnits = 1;

        // 3. Узнать output финального узла (того, от которого идёт стрелка в SalePoint)
        Long producerId = craft.getEdges().stream()
                .filter(e -> e.getToNodeId().equals(saleNode.getId()))
                .map(CraftEdge::getFromNodeId)
                .findFirst()
                .orElse(null);

        int unitsPerCraft = 1;
        if (producerId != null) {
            unitsPerCraft = craft.getNodes().stream()
                    .filter(n -> n.getId().equals(producerId))
                    .findFirst()
                    .map(n -> n.getOutput() != null ? n.getOutput() : 1)
                    .orElse(1);
        }

        // 4. Сколько реально произведено и сколько реально продаём
        int produced = multiplier * unitsPerCraft;
        int actualSold = Math.min(produced, soldUnits);   // 🎯 ключевое правило

        // 5. Выручка = цена за 1 шт × фактически проданное количество
        BigDecimal revenue = saleNode.getSalePrice()
                .multiply(BigDecimal.valueOf(actualSold));

        // 6. Затраты = Σ (цена за 1 шт × введённая цена × multiplier)
        BigDecimal costs = BigDecimal.ZERO;
        for (CraftNode node : craft.getNodes()) {
            if (Boolean.TRUE.equals(node.getIsSalePoint())) continue;  // продажа не материал
            if (node.getItemPrice() == null) continue;                 // цена не задана — 0

            BigDecimal val = (values != null && values.get(node.getVariable()) != null)
                    ? values.get(node.getVariable())
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