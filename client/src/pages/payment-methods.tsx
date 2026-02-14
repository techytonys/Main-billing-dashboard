import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Wallet, CreditCard, CheckCircle2, MoreVertical } from "lucide-react";
import { SiVisa, SiMastercard, SiAmericanexpress } from "react-icons/si";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaymentMethod } from "@shared/schema";

function getCardIcon(brand: string | null) {
  switch (brand?.toLowerCase()) {
    case "visa":
      return <SiVisa className="w-8 h-5 text-blue-600 dark:text-blue-400" />;
    case "mastercard":
      return <SiMastercard className="w-8 h-5 text-orange-500" />;
    case "amex":
      return <SiAmericanexpress className="w-8 h-5 text-blue-500" />;
    default:
      return <CreditCard className="w-6 h-5 text-muted-foreground" />;
  }
}

function PaymentMethodsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-1" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-16 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function PaymentMethods() {
  usePageTitle("Payment Methods");
  const { data: methods, isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
  });

  if (isLoading) {
    return <PaymentMethodsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Payment Methods
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your saved payment methods
        </p>
      </div>

      {methods && methods.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {methods.map((pm) => (
            <Card key={pm.id} className="p-5" data-testid={`card-payment-${pm.id}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-14 h-10 rounded-md bg-muted shrink-0">
                    {getCardIcon(pm.brand)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium capitalize">
                        {pm.brand || pm.type} ending in {pm.last4}
                      </p>
                      {pm.isDefault && (
                        <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Expires {pm.expiryMonth?.toString().padStart(2, "0")}/{pm.expiryYear}
                    </p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" data-testid={`button-more-${pm.id}`}>
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No payment methods saved</p>
        </Card>
      )}
    </div>
  );
}
