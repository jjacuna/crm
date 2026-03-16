import { required } from "ra-core";
import { TextInput } from "@/components/admin/text-input";
import { NumberInput } from "@/components/admin/number-input";
import { SelectInput } from "@/components/admin/select-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { DateInput } from "@/components/admin/date-input";

const intervalChoices = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const statusChoices = [
  { value: "active", label: "Active" },
  { value: "trial", label: "Trial" },
  { value: "past_due", label: "Past Due" },
  { value: "canceled", label: "Canceled" },
  { value: "ended", label: "Ended" },
];

const stripeAccountChoices = [
  { value: "community", label: "Community" },
  { value: "consulting", label: "Consulting" },
];

export const SubscriptionInputs = () => (
  <div className="flex flex-col gap-4 p-1">
    <h6 className="text-lg font-semibold">Subscription Details</h6>
    <ReferenceInput source="contact_id" reference="contacts">
      <AutocompleteInput
        optionText={(record) =>
          record ? `${record.first_name} ${record.last_name}` : ""
        }
        helperText={false}
      />
    </ReferenceInput>
    <TextInput
      source="plan_name"
      label="Plan Name"
      helperText={false}
      validate={required()}
    />
    <NumberInput
      source="amount"
      label="Amount (USD)"
      validate={required()}
      helperText={false}
    />
    <SelectInput
      source="interval"
      choices={intervalChoices}
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
    <DateInput source="start_date" label="Start Date" helperText={false} />
    <DateInput
      source="current_period_end"
      label="Current Period End"
      helperText={false}
    />
    <SelectInput
      source="stripe_account"
      label="Stripe Account"
      choices={stripeAccountChoices}
      optionText="label"
      optionValue="value"
      helperText={false}
    />
    <TextInput
      source="stripe_subscription_id"
      label="Stripe Subscription ID"
      helperText={false}
    />
    <ReferenceInput source="product_id" reference="products">
      <AutocompleteInput optionText="name" helperText={false} />
    </ReferenceInput>
  </div>
);
