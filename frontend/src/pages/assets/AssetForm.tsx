import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useAssetCategories } from "@/hooks/useOrganization";
import { useDepartments } from "@/hooks/useOrganization";
import type { Asset } from "@/types/assets";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  serial_number: z.string().optional(),
  location: z.string().optional(),
  condition: z.string().optional(),
  category_id: z.string().optional(),
  department_id: z.string().optional(),
  purchase_date: z.string().optional(),
  purchase_cost: z.string().optional(),
  current_value: z.string().optional(),
  warranty_expiry_date: z.string().optional(),
  is_bookable: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

const CONDITIONS = [
  { value: "New", label: "New" },
  { value: "Good", label: "Good" },
  { value: "Fair", label: "Fair" },
  { value: "Poor", label: "Poor" },
  { value: "Damaged", label: "Damaged" },
];

interface AssetFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  editing?: Asset | null;
  error?: string | null;
  isSaving?: boolean;
}

export function AssetForm({ open, onClose, onSubmit, editing, error, isSaving }: AssetFormProps) {
  const { data: categories } = useAssetCategories();
  const { data: departments } = useDepartments();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      if (editing) {
        reset({
          name: editing.name,
          description: editing.description ?? "",
          serial_number: editing.serial_number ?? "",
          location: editing.location ?? "",
          condition: editing.condition ?? "",
          category_id: editing.category_id ?? "",
          department_id: editing.department_id ?? "",
          purchase_date: editing.purchase_date ?? "",
          purchase_cost: editing.purchase_cost?.toString() ?? "",
          current_value: editing.current_value?.toString() ?? "",
          warranty_expiry_date: editing.warranty_expiry_date ?? "",
          is_bookable: editing.is_bookable,
        });
      } else {
        reset({ name: "", is_bookable: false });
      }
    }
  }, [open, editing, reset]);

  const catOptions = (categories?.items ?? []).map((c) => ({ value: c.id, label: c.name }));
  const deptOptions = (departments?.items ?? []).map((d) => ({ value: d.id, label: d.name }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit Asset — ${editing.asset_tag}` : "Register New Asset"}
      description={editing ? "Update asset details." : "Asset tag is auto-generated."}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {error && <Alert variant="error" message={error} />}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input id="a-name" label="Asset Name *" placeholder="e.g. Dell Laptop" error={errors.name?.message} {...register("name")} />
          </div>
          <Input id="a-serial" label="Serial Number" placeholder="SN-XXXXX" {...register("serial_number")} />
          <Input id="a-location" label="Location" placeholder="e.g. Office 2B" {...register("location")} />
          <Select id="a-cat" label="Category" options={catOptions} placeholder="Select category" {...register("category_id")} />
          <Select id="a-dept" label="Department" options={deptOptions} placeholder="Select department" {...register("department_id")} />
          <Select id="a-cond" label="Condition" options={CONDITIONS} placeholder="Select condition" {...register("condition")} />
          <Input id="a-pdate" label="Purchase Date" type="date" {...register("purchase_date")} />
          <Input id="a-pcost" label="Purchase Cost" type="number" placeholder="0.00" {...register("purchase_cost")} />
          <Input id="a-cval" label="Current Value" type="number" placeholder="0.00" {...register("current_value")} />
          <Input id="a-wexp" label="Warranty Expiry" type="date" {...register("warranty_expiry_date")} />
          <div className="col-span-2">
            <Input id="a-desc" label="Description" placeholder="Optional notes" {...register("description")} />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="a-bookable" {...register("is_bookable")} className="rounded" />
            <label htmlFor="a-bookable" className="text-sm text-slate-700 cursor-pointer">
              Shared / Bookable resource
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSaving}>
            {editing ? "Save Changes" : "Register Asset"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
