import { AdminMonetizationClient } from '@/components/admin-monetization-client';
import { AdminPremiumLifecycle } from '@/components/admin-premium-lifecycle';
import { AdminPremiumPlanManager } from '@/components/admin-premium-plan-manager';

export default function Page(){
 return <div className="space-y-6"><AdminPremiumLifecycle/><AdminPremiumPlanManager/><AdminMonetizationClient/></div>
}
