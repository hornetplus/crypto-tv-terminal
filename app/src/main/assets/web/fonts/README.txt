Сюда можно положить файл шрифта Manrope, чтобы получить точный вид дизайна.

1) Скачайте Manrope (Google Fonts / GitHub: github.com/sharanda/manrope),
   возьмите вариативный woff2 и переименуйте в:  Manrope-Variable.woff2
2) Положите его в эту папку (app/src/main/assets/web/fonts/).
3) В terminal.css раскомментируйте блок @font-face (он уже подготовлен).

Без этого файла используется системный шрифт Android TV (Roboto) — табло
выглядит чисто и работает полностью офлайн.
