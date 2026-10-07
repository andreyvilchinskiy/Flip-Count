package com.flipcount.service;

import com.flipcount.dto.DealRequest;
import com.flipcount.entity.Deal;
import com.flipcount.entity.Formula;
import com.flipcount.entity.Profile;
import com.flipcount.repository.DealRepository;
import com.flipcount.repository.ProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

/** Создание, список и удаление сделок. */
@Service
public class DealService {

    private final DealRepository deals;
    private final ProfileRepository profiles;
    private final FormulaService formulaService;

    public DealService(DealRepository deals,
                       ProfileRepository profiles,
                       FormulaService formulaService) {
        this.deals = deals;
        this.profiles = profiles;
        this.formulaService = formulaService;
    }

    public Deal create(String email, DealRequest req) {
        // Проверяем, что профиль принадлежит этому пользователю
        Profile profile = profiles.findById(req.getProfileId())
                .orElseThrow(() -> new IllegalArgumentException("Профиль не найден"));
        if (!profile.getUser().getEmail().equals(email))
            throw new IllegalArgumentException("Нет доступа к этому профилю");

        // Берём формулу: либо ту, что передали, либо активную
        Formula formula;
        if (req.getFormulaId() != null) {
            formula = formulaService.getOne(email, req.getFormulaId());
        } else {
            formula = formulaService.getActive(email);
            if (formula == null)
                throw new IllegalArgumentException("Нет активной формулы");
        }

        // Считаем прибыль
        BigDecimal profit = calculateProfit(formula.getExpression(), req.getValues());

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
     * Парсер формул. Поддерживает +, -, *, /, скобки, десятичные числа.
     * Если формула записана как «B - A = P», берётся только левая часть.
     */
    private BigDecimal calculateProfit(String expression, Map<String, BigDecimal> values) {
        if (expression == null || values == null) return BigDecimal.ZERO;

        // Убираем "= P" и всё после "=", если пользователь так написал
        String cleanExpr = expression.split("=")[0].trim();

        // Подставляем значения переменных
        String replaced = cleanExpr;
        for (Map.Entry<String, BigDecimal> entry : values.entrySet()) {
            // \b — граница слова, чтобы «A» не съело «AB»
            replaced = replaced.replaceAll("\\b" + entry.getKey() + "\\b",
                    entry.getValue().toString());
        }

        try {
            double result = eval(replaced);
            return BigDecimal.valueOf(result).setScale(2, RoundingMode.HALF_UP);
        } catch (Exception e) {
            throw new IllegalArgumentException("Ошибка в формуле: " + e.getMessage());
        }
    }

    /** Рекурсивный парсер простых математических выражений. */
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

    /** Удалить несколько сделок сразу. */
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