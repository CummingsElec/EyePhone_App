package com.ceim.roboteyes;

import android.app.admin.DeviceAdminReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

public class AdminReceiver extends DeviceAdminReceiver {

    public static ComponentName getComponentName(Context ctx) {
        return new ComponentName(ctx.getApplicationContext(), AdminReceiver.class);
    }

    @Override
    public void onEnabled(Context ctx, Intent intent) {}

    @Override
    public void onDisabled(Context ctx, Intent intent) {}
}
