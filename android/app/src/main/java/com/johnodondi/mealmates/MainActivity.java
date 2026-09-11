package com.johnodondi.mealmates;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String DEFAULT_TOP = "#EBE7E0";
    private static final String DEFAULT_BOTTOM = "#EBE7E0";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyBars(DEFAULT_TOP, DEFAULT_BOTTOM, true);
        getBridge().getWebView().addJavascriptInterface(new MealMatesChrome(), "MealMatesChrome");
    }

    private void applyBars(String topColor, String bottomColor, boolean lightSystemBars) {
        Window window = getWindow();
        window.setStatusBarColor(Color.parseColor(topColor));
        window.setNavigationBarColor(Color.parseColor(bottomColor));

        int flags = window.getDecorView().getSystemUiVisibility();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (lightSystemBars) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            } else {
                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (lightSystemBars) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            } else {
                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
        }
        window.getDecorView().setSystemUiVisibility(flags);
    }

    private class MealMatesChrome {
        @JavascriptInterface
        public void setBars(String topColor, String bottomColor, boolean lightSystemBars) {
            runOnUiThread(() -> applyBars(topColor, bottomColor, lightSystemBars));
        }
    }
}
