import { ShowBase, useShowContext } from "ra-core";
import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Subscription } from "../types";

const statusColors: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  trial: "outline",
  past_due: "destructive",
  canceled: "secondary",
  ended: "secondary",
};

export const SubscriptionShow = () => (
  <ShowBase>
    <SubscriptionShowContent />
  </ShowBase>
);

const SubscriptionShowContent = () => {
  const { record, isPending } = useShowContext<Subscription>();
  if (isPending || !record) return null;

  return (
    <div className="mt-2 flex lg:mr-72">
      <div className="flex-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{record.plan_name || "Subscription"}</span>
              <div className="flex gap-2">
                <Badge variant={statusColors[record.status] ?? "secondary"}>
                  {record.status}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {record.interval}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Amount
                </dt>
                <dd>
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: record.currency || "usd",
                  }).format(record.amount)}
                  /{record.interval === "monthly" ? "mo" : "yr"}
                </dd>
              </div>
              {record.contact_id && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Contact
                  </dt>
                  <dd>
                    <ReferenceField source="contact_id" reference="contacts">
                      <TextField source="first_name" />{" "}
                      <TextField source="last_name" />
                    </ReferenceField>
                  </dd>
                </div>
              )}
              {record.product_id && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Product
                  </dt>
                  <dd>
                    <ReferenceField source="product_id" reference="products">
                      <TextField source="name" />
                    </ReferenceField>
                  </dd>
                </div>
              )}
              {record.stripe_account && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Stripe Account
                  </dt>
                  <dd className="capitalize">{record.stripe_account}</dd>
                </div>
              )}
              {record.start_date && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Start Date
                  </dt>
                  <dd>
                    {new Date(record.start_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </dd>
                </div>
              )}
              {record.current_period_end && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Current Period End
                  </dt>
                  <dd>
                    {new Date(record.current_period_end).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </dd>
                </div>
              )}
              {record.canceled_at && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Canceled At
                  </dt>
                  <dd>
                    {new Date(record.canceled_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </dd>
                </div>
              )}
              {record.stripe_subscription_id && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Stripe Subscription ID
                  </dt>
                  <dd className="font-mono text-sm">
                    {record.stripe_subscription_id}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
