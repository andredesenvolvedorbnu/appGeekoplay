import { AdminMonetizationClient } from '@/components/admin-monetization-client';
import { AdminPremiumLifecycle } from '@/components/admin-premium-lifecycle';

export default function Page(){
 return <div className="space-y-6"><AdminPremiumLifecycle/><AdminMonetizationClient/></div>
}
