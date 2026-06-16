"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { addShoe, type ShoeFormState } from "@/app/actions/shoe";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { toDateInputValue } from "@/lib/format";

export function AddShoeForm() {
  const [state, formAction] = useActionState(addShoe, {} as ShoeFormState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <Card className="p-5">
      <h2 className="text-base font-extrabold text-ink">Add a shoe</h2>
      <form ref={formRef} action={formAction} className="mt-4 space-y-4">
        <div>
          <Label htmlFor="name">Shoe name</Label>
          <Input
            id="name"
            name="name"
            placeholder="Nike Pegasus 41"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="startDate">Start date</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={toDateInputValue(new Date())}
            />
          </div>
          <div>
            <Label htmlFor="mileageLimit">Mileage limit</Label>
            <Input
              id="mileageLimit"
              name="mileageLimit"
              type="number"
              min="50"
              max="1000"
              step="10"
              defaultValue={400}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="startingMiles">
            Starting mileage{" "}
            <span className="font-normal text-gray-400">(optional)</span>
          </Label>
          <Input
            id="startingMiles"
            name="startingMiles"
            type="number"
            min="0"
            max="2000"
            step="0.1"
            placeholder="0"
          />
          <p className="mt-1 text-xs text-gray-400">
            Miles already on the shoe before you started tracking here.
          </p>
        </div>
        {state.error ? (
          <p className="text-sm font-medium text-injury">{state.error}</p>
        ) : null}
        <SubmitButton />
      </form>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="md" className="w-full" disabled={pending}>
      <Plus className="h-4 w-4" />
      {pending ? "Adding…" : "Add shoe"}
    </Button>
  );
}
