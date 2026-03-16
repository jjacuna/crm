import { CreateBase, Form } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";
import { FormToolbar } from "../layout/FormToolbar";
import { PaymentInputs } from "./PaymentInputs";

export const PaymentCreate = () => (
  <CreateBase redirect="list">
    <div className="mt-2 flex lg:mr-72">
      <div className="flex-1">
        <Form
          defaultValues={{
            currency: "usd",
            payment_type: "one_time",
            status: "succeeded",
            payment_date: new Date().toISOString(),
          }}
        >
          <Card>
            <CardContent>
              <PaymentInputs />
              <FormToolbar />
            </CardContent>
          </Card>
        </Form>
      </div>
    </div>
  </CreateBase>
);
