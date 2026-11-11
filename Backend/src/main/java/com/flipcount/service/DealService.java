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

    public record CraftCalculation(BigDecimal profit, BigDecimal buyPrice, BigDecimal sellPrice) {}

    public Deal create(String email, DealRequest req) {
        Profile profile = profiles.findById(req.getProfileId())
                .orElseThrow(() -> new IllegalArgumentException("Профиль не найден"));
        if (!profile.getUser().getEmail().equals(email))
            throw new IllegalArgumentException("Нет доступа");

        Formula formula = req.getFormulaId() != null
                ? formulaService.getOne(email, req.getFormulaId())
                : formulaService.getActive(email);
        if (formula == null) throw new IllegalArgumentException("Нет активной формулы");

        int multiplier = req.getMultiplier() != null && req.getMultiplier() > 0 ? req.getMultiplier() : 1;

        BigDecimal profit, buyPrice, sellPrice;

        if (Boolean.TRUE.equals(formula.getIsCraft()) && formula.getCraftId() != null) {
            Craft craft = craftService.getOne(email, formula.getCraftId());
            CraftCalculation calc = calculateCraft(craft, req.getValues(), multiplier);
            profit = calc.profit();
            buyPrice = calc.buyPrice();
            sellPrice = calc.sellPrice();
        } else {
            profit = calculateProfit(formula.getExpression(), req.getValues());
            List<FormulaField> fields = formula.getFields();
            buyPrice = fields.size() > 0 ? getValue(req.getValues(), fields.get(0).getVariable()) : BigDecimal.ZERO;
            sellPrice = fields.size() > 1 ? getValue(req.getValues(), fields.get(1).getVariable()) : BigDecimal.ZERO;
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

    public Map<String, BigDecimal> preview(String email, DealRequest req) {
        Profile profile = profiles.findById(req.getProfileId())
                .orElseThrow(() -> new IllegalArgumentException("Профиль не найден"));
        if (!profile.getUser().getEmail().equals(email))
            throw new IllegalArgumentException("Нет доступа");

        Formula formula = req.getFormulaId() != null
                ? formulaService.getOne(email, req.getFormulaId())
                : formulaService.getActive(email);

        if (formula == null) return Map.of("profit", BigDecimal.ZERO);

        int multiplier = req.getMultiplier() != null && req.getMultiplier() > 0 ? req.getMultiplier() : 1;
        BigDecimal profit;

        if (Boolean.TRUE.equals(formula.getIsCraft()) && formula.getCraftId() != null) {
            Craft craft = craftService.getOne(email, formula.getCraftId());
            profit = calculateCraft(craft, req.getValues(), multiplier).profit();
        } else {
            profit = calculateProfit(formula.getExpression(), req.getValues());
        }
        return Map.of("profit", profit);
    }

    public CraftCalculation calculateCraft(Craft craft, Map<String, BigDecimal> values, int multiplier) {
        CraftNode saleNode = craft.getNodes().stream()
                .filter(n -> Boolean.TRUE.equals(n.getIsSalePoint()))
                .findFirst().orElse(null);

        BigDecimal costPerCraft = calculateMaterialCosts(craft, values);
        BigDecimal totalCost = costPerCraft.multiply(BigDecimal.valueOf(multiplier));

        if (saleNode == null || saleNode.getSalePrice() == null) {
            return new CraftCalculation(totalCost.negate().setScale(2, RoundingMode.HALF_UP), totalCost.setScale(2, RoundingMode.HALF_UP), BigDecimal.ZERO);
        }

        // Сколько единиц производится за 1 крафт
        int unitsPerCraft = 1;
        for (CraftEdge edge : craft.getEdges()) {
            if (edge.getToNodeId().equals(saleNode.getId())) {
                CraftNode producer = craft.getNodes().stream()
                        .filter(n -> n.getId().equals(edge.getFromNodeId()))
                        .findFirst().orElse(null);
                if (producer != null && producer.getOutput() != null) {
                    unitsPerCraft = producer.getOutput();
                }
                break;
            }
        }

        int totalProduced = multiplier * unitsPerCraft;

        // Сколько штук в лоте
        int itemsInLot = 1;
        for (CraftEdge edge : craft.getEdges()) {
            if (edge.getToNodeId().equals(saleNode.getId())) {
                itemsInLot = edge.getQuantity();
                break;
            }
        }

        // Количество целых лотов
        int totalLots = totalProduced / itemsInLot;

        // Цена берется из поля "S" (введенная пользователем) или из шаблона
        BigDecimal pricePerLot = (values != null && values.get("S") != null)
                ? values.get("S")
                : saleNode.getSalePrice();

        BigDecimal revenue = pricePerLot.multiply(BigDecimal.valueOf(totalLots));
        BigDecimal profit = revenue.subtract(totalCost).setScale(2, RoundingMode.HALF_UP);

        return new CraftCalculation(profit, totalCost.setScale(2, RoundingMode.HALF_UP), revenue.setScale(2, RoundingMode.HALF_UP));
    }

    private BigDecimal calculateMaterialCosts(Craft craft, Map<String, BigDecimal> values) {
        BigDecimal costs = BigDecimal.ZERO;
        for (CraftNode node : craft.getNodes()) {
            if (Boolean.TRUE.equals(node.getIsSalePoint())) continue;
            if (node.getItemPrice() == null) continue;

            BigDecimal val = (values != null && values.get(node.getVariable()) != null)
                    ? values.get(node.getVariable())
                    : BigDecimal.ZERO;
            costs = costs.add(node.getItemPrice().multiply(val));
        }
        return costs;
    }

    private BigDecimal getValue(Map<String, BigDecimal> values, String key) {
        return (values != null && values.get(key) != null) ? values.get(key) : BigDecimal.ZERO;
    }

    private BigDecimal calculateProfit(String expression, Map<String, BigDecimal> values) {
        if (expression == null || values == null) return BigDecimal.ZERO;
        String cleanExpr = expression.split("=")[0].trim();
        String replaced = cleanExpr;
        for (Map.Entry<String, BigDecimal> entry : values.entrySet()) {
            replaced = replaced.replaceAll("\\b" + entry.getKey() + "\\b", entry.getValue().toString());
        }
        replaced = replaced.replace("×", "*").replace("÷", "/").replace("−", "-").replace("—", "-");
        try {
            return BigDecimal.valueOf(eval(replaced)).setScale(2, RoundingMode.HALF_UP);
        } catch (Exception e) {
            throw new IllegalArgumentException("Ошибка в формуле: " + e.getMessage());
        }
    }

    private double eval(final String str) {
        return new Object() {
            int pos = -1, ch;
            void nextChar() { ch = (++pos < str.length()) ? str.charAt(pos) : -1; }
            boolean eat(int charToEat) {
                while (ch == ' ') nextChar();
                if (ch == charToEat) { nextChar(); return true; }
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
        Profile profile = profiles.findById(profileId).orElseThrow(() -> new IllegalArgumentException("Профиль не найден"));
        if (!profile.getUser().getEmail().equals(email)) throw new IllegalArgumentException("Нет доступа");
        return deals.findByProfileIdOrderByCreatedAtDesc(profileId);
    }

    public void delete(String email, Long dealId) {
        Deal deal = deals.findById(dealId).orElseThrow(() -> new IllegalArgumentException("Сделка не найдена"));
        if (!deal.getProfile().getUser().getEmail().equals(email)) throw new IllegalArgumentException("Нет доступа");
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