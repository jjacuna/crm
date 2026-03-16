import { ShowBase, useShowContext } from "ra-core";
import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Payment } from "../types";

const statusColors: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  succeeded: "default",
  pending: "outline",
  failed: "destructive",
  refunded: "secondary",
  canceled: "secondary",
};

const paymentTypeLabels: Record<string, string> = {
  one_time: "One-time",
  subscription: "Subscription",
  refund: "Refund",
};

export const PaymentShow = () => (
  <ShowBase>
    <PaymentShowContent />
  </ShowBase>
);

const PaymentShowContent = () => {
  const { record, isPending } = useShowContext<Payment>();
  if (isPending || !record) return null;

  return (
    <div className="mt-2 flex lg:mr-72">
      <div className="flex-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: record.currency || "usd",
                }).format(record.amount)}
              </span>
              <div className="flex gap-2">
                <Badge variant={statusColors[record.status] ?? "secondary"}>
                  {record.status}
                </Badge>
                <Badge variant="outline">
                  {paymentTypeLabels[record.payment_type] ??
                    record.payment_type}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Date
                </dt>
                <dd>
                  {new Date(record.payment_date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
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
              {record.stripe_payment_id && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Stripe Payment ID
                  </dt>
                  <dd className="font-mono text-sm">
                    {record.stripe_payment_id}
                  </dd>
                </div>
              )}
              {record.description && (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">
                    Description
                  </dt>
                  <dd>{record.description}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
