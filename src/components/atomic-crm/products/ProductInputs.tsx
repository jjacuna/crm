import { required } from "ra-core";
import { TextInput } from "@/components/admin/text-input";
import { NumberInput } from "@/components/admin/number-input";
import { SelectInput } from "@/components/admin/select-input";
import { BooleanInput } from "@/components/admin/boolean-input";

const categoryChoices = [
  { value: "workshop", label: "Saturday Workshop" },
  { value: "academy", label: "AI Empire Academy" },
  { value: "certification", label: "AI Systems Architect Certification" },
  { value: "corporate", label: "Corporate Consulting" },
];

export const ProductInputs = () => (
  <div className="flex flex-col gap-4 p-1">
    <h6 className="text-lg font-semibold">Product Details</h6>
    <TextInput source="name" validate={required()} helperText={false} />
    <SelectInput
      source="category"
      choices={categoryChoices}
      optionText="label"
      optionValue="value"
      validate={required()}
      helperText={false}
    />
    <NumberInput
      source="price"
      label="Price (USD)"
      defaultValue={0}
      helperText={false}
      validate={required()}
    />
    <BooleanInput source="is_active" label="Active" helperText={false} />
  </div>
);
