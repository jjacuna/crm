import { EditBase, Form } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";
import { FormToolbar } from "../layout/FormToolbar";
import { ProductInputs } from "./ProductInputs";

export const ProductEdit = () => (
  <EditBase redirect="list">
    <div className="mt-2 flex lg:mr-72">
      <div className="flex-1">
        <Form>
          <Card>
            <CardContent>
              <ProductInputs />
              <FormToolbar />
            </CardContent>
          </Card>
        </Form>
      </div>
    </div>
  </EditBase>
);
