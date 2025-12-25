import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  User, Wallet, DollarSign, ArrowDownToLine, ArrowUpFromLine, 
  TrendingUp, Users, Edit, Save, X, Clock, CheckCircle, XCircle,
  Plus, Minus, AlertTriangle, RotateCcw, Zap, Copy, ExternalLink,
  ArrowUpRight, ArrowDownRight, Network
} from "lucide-react";

interface EnhancedUserDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  userData: {
    deposits: any[];
    withdrawals: any[];
    cycles: any[];
    progress: any;
    downline: any[];
    upline: any[];
    earningsHistory: any[];
  } | null | undefined;
  isLoading: boolean;
  allUsers?: any[];
  onSelectUser?: (user: any) => void;
}

const EnhancedUserDetailsDialog = ({ 
  open, 
  onOpenChange, 
  user, 
  userData, 
  isLoading,
  allUsers,
  onSelectUser
}: EnhancedUserDetailsDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [quickAction, setQuickAction] = useState<string | null>(null);
  const [quickAmount, setQuickAmount] = useState("");
  const [editForm, setEditForm] = useState({
    wallet_balance: "",
    cycle_wallet_balance: "",
    referral_balance: "",
    direct_earnings_balance: "",
    total_deposits: "",
    total_withdrawals: "",
    total_profit: "",
    total_referral_earnings: "",
    total_direct_earnings: "",
  });

  const updateUserMutation = useMutation({
    mutationFn: async (updates: Record<string, number>) => {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-details-enhanced", user.id] });
      setIsEditing(false);
      setQuickAction(null);
      setQuickAmount("");
      toast({
        title: "Success",
        description: "User data updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const togglePenaltyMutation = useMutation({
    mutationFn: async (isPenalty: boolean) => {
      const { error } = await supabase
        .from("user_trade_progress")
        .update({ is_penalty_mode: isPenalty, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-details-enhanced", user.id] });
      toast({
        title: "Success",
        description: "Penalty mode toggled",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetProgressMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("user_trade_progress")
        .update({ 
          completed_cycles: [],
          is_penalty_mode: false,
          active_chance: null,
          chance_1_status: 'available',
          chance_2_status: 'locked',
          penalty_chance: null,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-details-enhanced", user.id] });
      toast({
        title: "Success",
        description: "User progress has been reset",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: text });
  };

  const handleStartEdit = () => {
    setEditForm({
      wallet_balance: String(user?.wallet_balance || 0),
      cycle_wallet_balance: String(user?.cycle_wallet_balance || 0),
      referral_balance: String(user?.referral_balance || 0),
      direct_earnings_balance: String(user?.direct_earnings_balance || 0),
      total_deposits: String(user?.total_deposits || 0),
      total_withdrawals: String(user?.total_withdrawals || 0),
      total_profit: String(user?.total_profit || 0),
      total_referral_earnings: String(user?.total_referral_earnings || 0),
      total_direct_earnings: String(user?.total_direct_earnings || 0),
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateUserMutation.mutate({
      wallet_balance: parseFloat(editForm.wallet_balance) || 0,
      cycle_wallet_balance: parseFloat(editForm.cycle_wallet_balance) || 0,
      referral_balance: parseFloat(editForm.referral_balance) || 0,
      direct_earnings_balance: parseFloat(editForm.direct_earnings_balance) || 0,
      total_deposits: parseFloat(editForm.total_deposits) || 0,
      total_withdrawals: parseFloat(editForm.total_withdrawals) || 0,
      total_profit: parseFloat(editForm.total_profit) || 0,
      total_referral_earnings: parseFloat(editForm.total_referral_earnings) || 0,
      total_direct_earnings: parseFloat(editForm.total_direct_earnings) || 0,
    });
  };

  const handleQuickAction = (action: string) => {
    const amount = parseFloat(quickAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Error", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    let updates: Record<string, number> = {};
    const currentValue = (field: string) => Number(user?.[field] || 0);

    switch (action) {
      case "add_main":
        updates = { 
          wallet_balance: currentValue("wallet_balance") + amount,
          total_deposits: currentValue("total_deposits") + amount 
        };
        break;
      case "deduct_main":
        updates = { wallet_balance: Math.max(0, currentValue("wallet_balance") - amount) };
        break;
      case "add_cycle":
        updates = { cycle_wallet_balance: currentValue("cycle_wallet_balance") + amount };
        break;
      case "deduct_cycle":
        updates = { cycle_wallet_balance: Math.max(0, currentValue("cycle_wallet_balance") - amount) };
        break;
      case "add_team":
        updates = { 
          referral_balance: currentValue("referral_balance") + amount,
          total_referral_earnings: currentValue("total_referral_earnings") + amount
        };
        break;
      case "deduct_team":
        updates = { referral_balance: Math.max(0, currentValue("referral_balance") - amount) };
        break;
      case "add_direct":
        updates = { 
          direct_earnings_balance: currentValue("direct_earnings_balance") + amount,
          total_direct_earnings: currentValue("total_direct_earnings") + amount
        };
        break;
      case "deduct_direct":
        updates = { direct_earnings_balance: Math.max(0, currentValue("direct_earnings_balance") - amount) };
        break;
    }

    updateUserMutation.mutate(updates);
  };

  const navigateToUser = (userId: string) => {
    const targetUser = allUsers?.find(u => u.id === userId);
    if (targetUser && onSelectUser) {
      onSelectUser(targetUser);
    }
  };

  if (!user) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
      case "completed":
      case "paid":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{status}</Badge>;
      case "pending":
      case "active":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{status}</Badge>;
      case "rejected":
      case "broken":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              User Details
              {user.isAdmin && <Badge className="ml-2">Admin</Badge>}
            </div>
            {!isEditing ? (
              <Button size="sm" variant="outline" onClick={handleStartEdit}>
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateUserMutation.isPending}>
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[75vh]">
          <div className="space-y-4 pr-4">
            {/* User Info Header */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">User ID</Label>
                    <div className="flex items-center gap-1">
                      <p className="font-mono text-sm break-all">{user.id.slice(0, 12)}...</p>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(user.id)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Email</Label>
                    <p className="text-sm">{user.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Telegram</Label>
                    <p className="text-sm">{user.telegram_username || user.telegram_first_name || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Referral Code</Label>
                    <div className="flex items-center gap-1">
                      <p className="font-mono text-sm font-bold text-primary">{user.referral_code}</p>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(user.referral_code)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Referred By</Label>
                    {user.referred_by_code ? (
                      <div className="flex items-center gap-1">
                        <p className="font-mono text-sm">{user.referred_by_code}</p>
                        <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Direct signup</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Joined</Label>
                    <p className="text-sm">{new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button size="sm" variant="outline" className="text-green-400 border-green-400/30" onClick={() => setQuickAction("add_main")}>
                    <Plus className="w-3 h-3 mr-1" /> Main
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-400 border-red-400/30" onClick={() => setQuickAction("deduct_main")}>
                    <Minus className="w-3 h-3 mr-1" /> Main
                  </Button>
                  <Button size="sm" variant="outline" className="text-green-400 border-green-400/30" onClick={() => setQuickAction("add_cycle")}>
                    <Plus className="w-3 h-3 mr-1" /> Cycle
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-400 border-red-400/30" onClick={() => setQuickAction("deduct_cycle")}>
                    <Minus className="w-3 h-3 mr-1" /> Cycle
                  </Button>
                  <Button size="sm" variant="outline" className="text-green-400 border-green-400/30" onClick={() => setQuickAction("add_team")}>
                    <Plus className="w-3 h-3 mr-1" /> Team
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-400 border-red-400/30" onClick={() => setQuickAction("deduct_team")}>
                    <Minus className="w-3 h-3 mr-1" /> Team
                  </Button>
                  <Button size="sm" variant="outline" className="text-green-400 border-green-400/30" onClick={() => setQuickAction("add_direct")}>
                    <Plus className="w-3 h-3 mr-1" /> Direct
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-400 border-red-400/30" onClick={() => setQuickAction("deduct_direct")}>
                    <Minus className="w-3 h-3 mr-1" /> Direct
                  </Button>
                </div>

                {quickAction && (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Label className="text-xs whitespace-nowrap">{quickAction.replace(/_/g, " ").toUpperCase()}:</Label>
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={quickAmount}
                      onChange={(e) => setQuickAmount(e.target.value)}
                      className="w-32"
                    />
                    <Button size="sm" onClick={() => handleQuickAction(quickAction)} disabled={updateUserMutation.isPending}>
                      Apply
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setQuickAction(null); setQuickAmount(""); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Progress Controls */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button 
                    size="sm" 
                    variant={userData?.progress?.is_penalty_mode ? "destructive" : "outline"}
                    onClick={() => togglePenaltyMutation.mutate(!userData?.progress?.is_penalty_mode)}
                    disabled={togglePenaltyMutation.isPending}
                  >
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {userData?.progress?.is_penalty_mode ? "Disable Penalty" : "Enable Penalty"}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => resetProgressMutation.mutate()}
                    disabled={resetProgressMutation.isPending}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset Progress
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Balances */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {isEditing ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Main Wallet</Label>
                    <Input
                      type="number"
                      value={editForm.wallet_balance}
                      onChange={(e) => setEditForm({ ...editForm, wallet_balance: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cycle Wallet</Label>
                    <Input
                      type="number"
                      value={editForm.cycle_wallet_balance}
                      onChange={(e) => setEditForm({ ...editForm, cycle_wallet_balance: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Team Income</Label>
                    <Input
                      type="number"
                      value={editForm.referral_balance}
                      onChange={(e) => setEditForm({ ...editForm, referral_balance: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Direct Earnings</Label>
                    <Input
                      type="number"
                      value={editForm.direct_earnings_balance}
                      onChange={(e) => setEditForm({ ...editForm, direct_earnings_balance: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-muted-foreground">Main Wallet</span>
                      </div>
                      <p className="text-xl font-bold text-green-400">${Number(user.wallet_balance || 0).toFixed(2)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-purple-400" />
                        <span className="text-xs text-muted-foreground">Cycle Wallet</span>
                      </div>
                      <p className="text-xl font-bold text-purple-400">${Number(user.cycle_wallet_balance || 0).toFixed(2)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-muted-foreground">Team Income</span>
                      </div>
                      <p className="text-xl font-bold text-blue-400">${Number(user.referral_balance || 0).toFixed(2)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <span className="text-xs text-muted-foreground">Direct Earnings</span>
                      </div>
                      <p className="text-xl font-bold text-primary">${Number(user.direct_earnings_balance || 0).toFixed(2)}</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Total Deposits</p>
                <p className="font-bold">${Number(user.total_deposits || 0).toFixed(2)}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Total Withdrawals</p>
                <p className="font-bold">${Number(user.total_withdrawals || 0).toFixed(2)}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Total Profit</p>
                <p className="font-bold text-green-400">${Number(user.total_profit || 0).toFixed(2)}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Total Referral</p>
                <p className="font-bold text-blue-400">${Number(user.total_referral_earnings || 0).toFixed(2)}</p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : userData && (
              <Tabs defaultValue="network" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="network" className="flex items-center gap-1">
                    <Network className="w-3 h-3" />
                    Network
                  </TabsTrigger>
                  <TabsTrigger value="cycles">Cycles ({userData.cycles.length})</TabsTrigger>
                  <TabsTrigger value="deposits">Deposits ({userData.deposits.length})</TabsTrigger>
                  <TabsTrigger value="withdrawals">Withdrawals ({userData.withdrawals.length})</TabsTrigger>
                  <TabsTrigger value="earnings">Earnings</TabsTrigger>
                </TabsList>

                <TabsContent value="network" className="space-y-4">
                  {/* Upline */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ArrowUpRight className="w-4 h-4 text-blue-400" />
                        Upline (Referrers) - {userData.upline.length} levels
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {userData.upline.length > 0 ? (
                        <div className="space-y-2">
                          {userData.upline.map((upline: any) => (
                            <div
                              key={upline.profile?.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 cursor-pointer hover:bg-blue-500/20"
                              onClick={() => upline.profile?.id && navigateToUser(upline.profile.id)}
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-blue-400">L{upline.level}</Badge>
                                <div>
                                  <p className="text-sm font-medium">{upline.profile?.telegram_username || upline.profile?.email}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{upline.profile?.referral_code}</p>
                                </div>
                              </div>
                              <ExternalLink className="w-4 h-4 text-muted-foreground" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-2">Direct signup - no upline</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Downline */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ArrowDownRight className="w-4 h-4 text-green-400" />
                        Downline (Referrals) - {userData.downline.length} users
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {userData.downline.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {userData.downline.map((down: any) => (
                            <div
                              key={down.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/20 cursor-pointer hover:bg-green-500/20"
                              onClick={() => down.profile?.id && navigateToUser(down.profile.id)}
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-green-400">L{down.level}</Badge>
                                <div>
                                  <p className="text-sm font-medium">{down.profile?.telegram_username || down.profile?.email}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{down.profile?.referral_code}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">${Number(down.profile?.total_deposits || 0).toFixed(0)}</p>
                                <p className="text-xs text-muted-foreground">deposits</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-2">No referrals yet</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="cycles" className="space-y-2">
                  {userData.progress && (
                    <Card className="bg-muted/30">
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Active Chance:</span>{" "}
                            <Badge>{userData.progress.active_chance || "None"}</Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Chance 1:</span>{" "}
                            {getStatusBadge(userData.progress.chance_1_status)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Chance 2:</span>{" "}
                            {getStatusBadge(userData.progress.chance_2_status)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Penalty Mode:</span>{" "}
                            <Badge variant={userData.progress.is_penalty_mode ? "destructive" : "secondary"}>
                              {userData.progress.is_penalty_mode ? "Yes" : "No"}
                            </Badge>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Completed Cycles:</span>{" "}
                            {userData.progress.completed_cycles?.join(", ") || "None"}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {userData.cycles.map((cycle: any) => (
                    <Card key={cycle.id} className="bg-card/50">
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Badge variant="outline" className="mr-2">
                              {cycle.cycle_type === 4 ? "Special" : `Cycle ${cycle.cycle_type}`}
                            </Badge>
                            {getStatusBadge(cycle.status)}
                          </div>
                          <span className="text-sm font-medium">${Number(cycle.investment_amount).toFixed(2)}</span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(cycle.start_date).toLocaleDateString()} → {new Date(cycle.end_date).toLocaleDateString()}
                          <span className="ml-2 text-green-400">Profit: ${Number(cycle.current_profit || 0).toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {userData.cycles.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No cycles found</p>
                  )}
                </TabsContent>

                <TabsContent value="deposits" className="space-y-2">
                  {userData.deposits.map((deposit: any) => (
                    <Card key={deposit.id} className="bg-card/50">
                      <CardContent className="py-3 flex items-center justify-between">
                        <div>
                          <span className="font-medium">${Number(deposit.amount).toFixed(2)}</span>
                          <p className="text-xs text-muted-foreground">
                            {new Date(deposit.created_at).toLocaleString()}
                          </p>
                        </div>
                        {getStatusBadge(deposit.status)}
                      </CardContent>
                    </Card>
                  ))}
                  {userData.deposits.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No deposits found</p>
                  )}
                </TabsContent>

                <TabsContent value="withdrawals" className="space-y-2">
                  {userData.withdrawals.map((withdrawal: any) => (
                    <Card key={withdrawal.id} className="bg-card/50">
                      <CardContent className="py-3 flex items-center justify-between">
                        <div>
                          <span className="font-medium">${Number(withdrawal.amount).toFixed(2)}</span>
                          <p className="text-xs text-muted-foreground font-mono">
                            {withdrawal.wallet_address?.slice(0, 20)}...
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(withdrawal.created_at).toLocaleString()}
                          </p>
                        </div>
                        {getStatusBadge(withdrawal.status)}
                      </CardContent>
                    </Card>
                  ))}
                  {userData.withdrawals.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No withdrawals found</p>
                  )}
                </TabsContent>

                <TabsContent value="earnings" className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <Card className="bg-blue-500/10 border-blue-500/20">
                      <CardContent className="py-3 text-center">
                        <p className="text-xs text-muted-foreground">Total Team Earnings</p>
                        <p className="text-lg font-bold text-blue-400">${Number(user.total_referral_earnings || 0).toFixed(2)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-primary/10 border-primary/20">
                      <CardContent className="py-3 text-center">
                        <p className="text-xs text-muted-foreground">Total Direct Earnings</p>
                        <p className="text-lg font-bold text-primary">${Number(user.total_direct_earnings || 0).toFixed(2)}</p>
                      </CardContent>
                    </Card>
                  </div>
                  {userData.earningsHistory.map((earning: any) => (
                    <Card key={earning.id} className="bg-card/50">
                      <CardContent className="py-2 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">L{earning.referral_level}</Badge>
                            <Badge className={earning.source_type === 'deposit' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}>
                              {earning.source_type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {earning.commission_percent}% of ${Number(earning.source_amount).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-400">+${Number(earning.amount).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(earning.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {userData.earningsHistory.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No earnings history</p>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedUserDetailsDialog;
