import { Link } from "react-router-dom";
import { useStore } from "@/contexts/StoreContext";
import { useShopInfo } from "@/hooks/useShopInfo";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

const Index = () => {
  const { currentStore } = useStore();
  const { info: config } = useShopInfo();

  const mainTitle = currentStore?.name ?? "線上預約";
  const subtitle = config.frontend_subtitle || "線上預約系統";
  const businessHours = config.business_hours || "尚未設定營業時間";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-4xl font-bold text-foreground">
          {mainTitle}
        </h1>
        <p className="text-xl text-muted-foreground">
          {subtitle}
        </p>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Clock className="w-5 h-5" />
          <span>{businessHours}</span>
        </div>
        <Button asChild size="lg" className="mt-4">
          <Link to="/booking">立即預約</Link>
        </Button>
      </div>
    </div>
  );
};

export default Index;
