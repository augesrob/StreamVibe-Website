import { supabase } from '@/lib/customSupabaseClient';

/**
 * Utility to test PayPal Integration via Edge Functions
 * Run this from the browser console or attach to a debug button
 */
export const testPayPalIntegration = async () => {
    console.group("🛠️ PayPal Integration Test");
    
    try {
        // Step 1: Test Configuration
        console.log("1️⃣ Testing Configuration (paypal-test-config)...");
        const configStart = performance.now();
        const { data: configData, error: configError } = await supabase.functions.invoke('paypal-test-config', {
            method: 'GET'
        });
        const configEnd = performance.now();

        if (configError) {
            console.error("❌ Config Test Failed (Network/Auth):", configError);
            console.groupEnd();
            return { success: false, step: 'config', error: configError };
        }

        console.log(`   Response (${Math.round(configEnd - configStart)}ms):`, configData);

        if (!configData.success) {
            console.warn("⚠️ Config Check Returned Failure:", configData.message);
            // We verify if we should proceed
            if (!configData.credentials_found) {
                console.error("🛑 Stopping: No credentials found.");
                console.groupEnd();
                return { success: false, step: 'config', error: 'No Credentials' };
            }
        } else {
            console.log("✅ Configuration looks good!");
        }

        // Step 2: Test Order Creation
        console.log("\n2️⃣ Testing Order Creation (paypal-create-order)...");
        const orderStart = performance.now();
        const { data: orderData, error: orderError } = await supabase.functions.invoke('paypal-create-order', {
            body: {
                amount: 10.00,
                currency: "USD",
                description: "Integration Test Order",
                returnUrl: window.location.origin + "/test-success",
                cancelUrl: window.location.origin + "/test-cancel"
            }
        });
        const orderEnd = performance.now();

        if (orderError) {
            console.error("❌ Order Test Failed (Network/Auth):", orderError);
            console.groupEnd();
            return { success: false, step: 'create-order', error: orderError };
        }

        console.log(`   Response (${Math.round(orderEnd - orderStart)}ms):`, orderData);

        if (orderData.success && orderData.order_id) {
            console.log(`✅ Order Created Successfully! ID: ${orderData.order_id}`);
            const approveLink = orderData.links?.find(l => l.rel === 'approve')?.href;
            console.log(`   Approval Link: ${approveLink || 'Not found in links'}`);
            console.log("🎉 Integration Test Complete: SUCCESS");
            console.groupEnd();
            return { success: true, orderId: orderData.order_id };
        } else {
            console.error("❌ Order Creation Returned Failure:", orderData.message);
            console.groupEnd();
            return { success: false, step: 'create-order', error: orderData };
        }

    } catch (e) {
        console.error("💥 Unexpected Exception:", e);
        console.groupEnd();
        return { success: false, error: e };
    }
};

// Make it available globally for console testing
if (typeof window !== 'undefined') {
    window.testPayPal = testPayPalIntegration;
}