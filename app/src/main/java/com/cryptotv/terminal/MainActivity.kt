package com.cryptotv.terminal

import android.annotation.SuppressLint
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebView
import android.webkit.WebViewClient
import android.app.Activity

/**
 * Crypto TV Terminal — полноэкранный «киоск» для Android TV.
 *
 * Активити поднимает один WebView во весь экран и грузит локально упакованное
 * табло (assets/web/index.html). Весь UI, анимации и mock-данные живут в
 * вебе — это и есть тот «внешний слой», что был собран в дизайне; здесь —
 * нативная обёртка, которая делает из него постоянно работающее TV-приложение.
 *
 * Что обеспечивает обёртка (см. ТЗ §3, §19):
 *  - экран не гаснет (FLAG_KEEP_SCREEN_ON) — табло работает 24/7;
 *  - иммерсивный полноэкранный режим без системных панелей;
 *  - landscape (также зафиксирован в манифесте);
 *  - локальная загрузка из assets → работает офлайн, без зависимости от сети;
 *  - кнопка BACK не закрывает приложение случайно с пульта (kiosk).
 *
 * Время берётся самим вебом через системный `new Date()`, поэтому реагирует на
 * смену времени/таймзоны устройства без перезапуска (ТЗ §3.3, §19.1).
 */
class MainActivity : Activity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Экран не должен засыпать — это информационное табло.
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        webView = WebView(this).apply {
            with(settings) {
                javaScriptEnabled = true            // нужно для логики/анимаций табло
                domStorageEnabled = true
                databaseEnabled = true
                // ВАЖНО: масштабированием занимается сам макет (JS fitStage).
                // Поэтому WebView НЕ должен дополнительно зумить страницу —
                // иначе верстка не вписывается в экран (двойное масштабирование).
                useWideViewPort = false
                loadWithOverviewMode = false
                builtInZoomControls = false
                displayZoomControls = false
                setSupportZoom(false)
                cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
                mediaPlaybackRequiresUserGesture = false
                // Разрешаем странице из assets (file://) ходить в сеть к API/вебсокетам.
                // Это безопасно: WebView грузит только нашу собственную страницу.
                allowFileAccess = true
                allowContentAccess = true
                @Suppress("DEPRECATION") allowFileAccessFromFileURLs = true
                @Suppress("DEPRECATION") allowUniversalAccessFromFileURLs = true
                mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            }
            // Без внешних переходов: всё рендерится внутри одного WebView.
            webViewClient = WebViewClient()
            // Чёрный фон под леттербоксом дизайна (#04060B), пока идёт первый кадр.
            setBackgroundColor(0xFF04060B.toInt())
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
        }

        setContentView(webView)
        enterImmersiveMode()

        // Локально упакованное табло. Никакой сети не требуется.
        webView.loadUrl("file:///android_asset/web/index.html")
    }

    /** Прячем статус-бар и навигацию, держим полноэкранный режим. */
    @Suppress("DEPRECATION")
    private fun enterImmersiveMode() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes = window.attributes.apply {
                layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) enterImmersiveMode()
    }

    /**
     * Глотаем BACK, чтобы табло нельзя было случайно закрыть пультом.
     * Если для отладки нужно обычное поведение — удалите этот метод.
     */
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) return true
        return super.onKeyDown(keyCode, event)
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        webView.resumeTimers()
    }

    override fun onPause() {
        super.onPause()
        // Для информационного табло обычно держим его «живым» в фоне; если
        // хотите экономить ресурсы при сворачивании — раскомментируйте:
        // webView.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
