import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MYPAYVERSE_BASE_URL = "https://api.mypayverse.xyz";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Service role client for updating profiles
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerId = Deno.env.get("MYPAYVERSE_CUSTOMER_ID");
    if (!customerId) {
      console.error("MYPAYVERSE_CUSTOMER_ID not configured");
      return new Response(
        JSON.stringify({ error: "Payment service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, ...params } = await req.json();
    console.log(`MyPayVerse action: ${action} for user: ${user.id}`);

    switch (action) {
      case "create_wallet": {
        // Create a wallet for the user
        const response = await fetch(`${MYPAYVERSE_BASE_URL}/api/v1/customers/wallet`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            customerId: customerId,
          }),
        });

        const data = await response.json();
        console.log("Create wallet response:", data);

        if (!response.ok) {
          return new Response(
            JSON.stringify({ error: data.message || data.responseMessage || "Failed to create wallet" }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // MyPayVerse API returns data in result.wallet or data
        const walletData = data.result?.wallet || data.data;
        return new Response(
          JSON.stringify({ success: true, wallet: walletData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_wallet": {
        // Get wallet details for the user
        const response = await fetch(
          `${MYPAYVERSE_BASE_URL}/api/v1/customers/wallet/details?userId=${user.id}&customerId=${customerId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();
        console.log("Get wallet response:", data);

        if (!response.ok) {
          // If wallet doesn't exist, return null (user needs to create one)
          if (response.status === 404) {
            return new Response(
              JSON.stringify({ success: true, wallet: null }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          return new Response(
            JSON.stringify({ error: data.message || data.responseMessage || "Failed to get wallet" }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // MyPayVerse API returns data in result.wallet
        const walletData = data.result?.wallet || data.data;
        
        // AUTO-SYNC: Detect new deposits from MyPayVerse and ADD to wallet_balance
        // IMPORTANT: We track lastSyncedDeposit to know how much has already been credited
        // We should NOT overwrite wallet_balance with MyPayVerse balance (wallet has more than just deposits)
        if (walletData && walletData.totalDeposit !== undefined) {
          const myPayVerseTotalDeposit = parseFloat(walletData.totalDeposit) || 0;
          
          // Get current profile to check if new deposits were made
          const { data: currentProfile } = await supabaseAdmin
            .from('profiles')
            .select('wallet_balance, total_deposits')
            .eq('id', user.id)
            .single();
          
          const currentTotalDeposits = currentProfile?.total_deposits || 0;
          const currentWalletBalance = currentProfile?.wallet_balance || 0;
          
          // If MyPayVerse totalDeposit is higher than our tracked total_deposits, new deposit detected
          if (myPayVerseTotalDeposit > currentTotalDeposits) {
            const newDepositAmount = myPayVerseTotalDeposit - currentTotalDeposits;
            console.log(`New deposit detected for user ${user.id}: $${newDepositAmount} (MyPayVerse total: ${myPayVerseTotalDeposit}, Our total: ${currentTotalDeposits})`);
            
            // ADD the new deposit to wallet_balance (don't overwrite!)
            const { error: updateError } = await supabaseAdmin
              .from('profiles')
              .update({ 
                wallet_balance: currentWalletBalance + newDepositAmount,
                total_deposits: myPayVerseTotalDeposit,
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id);
            
            if (updateError) {
              console.error("Failed to credit deposit:", updateError);
            } else {
              console.log(`Successfully credited $${newDepositAmount} to user ${user.id}`);
            }
          }
        }
        
        return new Response(
          JSON.stringify({ success: true, wallet: walletData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_transactions": {
        // Get transactions for the user
        const { walletAddress } = params;
        
        if (!walletAddress) {
          return new Response(
            JSON.stringify({ error: "Wallet address required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const response = await fetch(
          `${MYPAYVERSE_BASE_URL}/api/v1/customers/wallet/transactions?walletAddress=${walletAddress}&customerId=${customerId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();
        console.log("Get transactions response:", data);

        if (!response.ok) {
          return new Response(
            JSON.stringify({ error: data.message || data.responseMessage || "Failed to get transactions" }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // MyPayVerse API returns data in result.transactions or data
        const txData = data.result?.transactions || data.data || [];
        return new Response(
          JSON.stringify({ success: true, transactions: txData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "withdraw": {
        // Submit a withdrawal request
        const { amount, walletAddress } = params;
        
        if (!amount || amount <= 0) {
          return new Response(
            JSON.stringify({ error: "Invalid amount" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!walletAddress) {
          return new Response(
            JSON.stringify({ error: "Wallet address required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const response = await fetch(`${MYPAYVERSE_BASE_URL}/api/v1/assetsTransaction/WithdrawAsset`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            customerId: customerId,
            amount: amount,
            toAddress: walletAddress,
          }),
        });

        const data = await response.json();
        console.log("Withdraw response:", data);

        if (!response.ok) {
          return new Response(
            JSON.stringify({ error: data.message || "Failed to submit withdrawal" }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, transaction: data.data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("MyPayVerse error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
