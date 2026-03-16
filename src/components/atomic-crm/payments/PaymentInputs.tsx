import { required } from "ra-core";
import { TextInput } from "@/components/admin/text-input";
import { NumberInput } from "@/components/admin/number-input";
import { SelectInput } from "@/components/admin/select-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { DateInput } from "@/components/admin/date-input";

const paymentTypeChoices = [
  { value: "one_time", label: "One-time" },
  { value: "subscription", label: "Subscription" },
  { value: "refund", label: "Refund" },
];

const statusChoices = [
  { value: "succeeded", label: "Succeeded" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
  { value: "canceled", label: "Canceled" },
];

const stripeAccountChoices = [
  { value: "community", label: "Community" },
  { value: "consulting", label: "Consulting" },
];

export const PaymentInputs = () => (
  <div className="flex flex-col gap-4 p-1">
    <h6 className="text-lg font-semibold">Payment Details</h6>
    <ReferenceInput source="contact_id" reference="contacts">
      <AutocompleteInput
        optionText={(record) =>
          record ? `${record.first_name} ${record.last_name}` : ""
        }
        helperText={false}
      />
    </ReferenceInput>
    <NumberInput
      source="amount"
      label="Amount (USD)"
      validate={required()}
      helperText={false}
    />
    <SelectInput
      source="payment_type"
      label="Payment Type"
      choices={paymentTypeChoices}
      optionText="label"
      optionValue="value"
      validate={required()}
      helperText={false}
    />
    <SelectInput
      source="status"
      choices={statusChoices}
      optionText="label"
      optionValue="value"
      validate={required()}
      helperText={false}
    />
    <DateInput source="payment_date" label="Payment Date" helperText={false} />
    <TextInput source="description" helperText={false} />
    <SelectInput
      source="stripe_account"
      label="Stripe Account"
      choices={stripeAccountChoices}
      optionText="label"
      optionValue="value"
      helperText={false}
    />
    <TextInput
      source="stripe_payment_id"
      label="Stripe Payment ID"
      helperText={false}
    />
    <ReferenceInput source="product_id" reference="products">
      <AutocompleteInput optionText="name" helperText={false} />
    </ReferenceInput>
  </div>
);
