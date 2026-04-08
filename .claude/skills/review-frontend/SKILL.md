---
name: review-frontend
description: Review the Streamlit frontend for UI consistency, alignment, and pixel-perfect layout. Use when the user wants to check the frontend code quality or fix visual issues.
---

When reviewing the frontend (`app.py`):

## Layout & Alignment Checks

1. **Column balance**: Verify `st.columns()` calls use consistent widths. Related controls should be grouped logically (entry criteria together, exit criteria together).

2. **Consistent spacing**: Check for `st.markdown("---")` dividers between sections. Every major section should have a header (`st.header` or `st.subheader`).

3. **Widget consistency**: Ensure similar parameters use the same widget type across strategies:
   - DTE ranges → `st.slider` with matching min/max bounds
   - Delta → `st.slider` with `format="%.2f"`
   - Dollar amounts → `st.number_input` with `step` and `format`
   - Percentages → `st.slider` with clear labels showing %

4. **Labels & help text**: Every input should have a clear label. Non-obvious parameters need `help=` tooltips. Units should be in labels (e.g., "Spread Width ($)", "Take Profit (%)").

## Metric Display Checks

5. **Metric cards**: Results should use `st.metric()` in evenly-sized columns. Format consistently:
   - Percentages: `f"{value:.2f}%"`
   - Dollar amounts: `f"${value:,.2f}"`
   - Counts: `f"{value}"`

6. **Charts**: Equity curve should use `use_container_width=True`. Axes should be labeled. Check that empty data doesn't cause chart errors.

7. **Trade log table**: Columns should have readable headers. P&L should be formatted as currency. Use `hide_index=True`.

## Code Quality Checks

8. **Strategy parity**: Every strategy in the sidebar dropdown must have a matching parameter panel in the main area AND a matching case in `build_strategy()`. Missing any = runtime error.

9. **Variable scoping**: Ensure slider/input variables (like `min_dte`, `short_delta`) are defined in all code paths before `build_strategy()` uses them. Streamlit reruns the whole script on interaction.

10. **Error handling**: Check for `st.stop()` after `st.error()`. Verify empty results don't crash the display (no trades, empty equity curve).

## How to Fix Issues

- Read `app.py` fully before suggesting changes
- Fix alignment by adjusting column ratios or reordering widgets
- Ensure all strategies follow the same visual pattern
- Test by running `py -m streamlit run app.py` and checking each strategy
