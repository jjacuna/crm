import { CreateBase, Form } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";
import { FormToolbar } from "../layout/FormToolbar";
import { SubscriptionInputs } from "./SubscriptionInputs";

export const SubscriptionCreate = () => (
  <CreateBase redirect="list">
    <div className="mt-2 flex lg:mr-72">
      <div className="flex-1">
        <Form
          defaultValues={{
            currency: "usd",
            interval: "monthly",
            status: "active",
            start_date: new Date().toISOString(),
          }}
        >
          <Card>
            <CardContent>
              <SubscriptionInputs />
              <FormToolbar />
            </CardContent>
          </Card>
        </Form>
      </div>
    </div>
  </CreateBase>
);
