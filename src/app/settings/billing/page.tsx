import { getUserSubscriptionPlan } from "@/lib/stripe";
import BillingForm from "./billingform";

const Page = async () => {
  const subscriptionPlan = await getUserSubscriptionPlan();

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center">
      <BillingForm subscriptionPlan={subscriptionPlan} />
    </div>
  );
};

export default Page;
