package com.reloto.coinlover;

import android.os.Bundle;
import android.webkit.PermissionRequest;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.community.speechrecognition.SpeechRecognition;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SpeechRecognition.class);
        super.onCreate(savedInstanceState);
    }
}
