"use client";

import { saveBasics } from "@/app/app/profile/actions";
import { SelectField, TextField } from "./fields";
import { ItemForm } from "./item-form";
import { SectionCard } from "./section-card";

export type BasicsValues = {
  headline: string;
  city: string;
  phone: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  yearsExperience: string;
  targetMarket: string;
};

export function BasicsForm({ values }: { values: BasicsValues }) {
  return (
    <SectionCard id="basics" title="Basics" intro="The details that go at the top of a resume. All optional.">
      <ItemForm action={saveBasics} submitLabel="Save details">
        {(err) => (
          <>
            <TextField name="headline" label="Headline" optional defaultValue={values.headline} error={err("headline")} maxLength={120} placeholder="Backend developer who ships reliable APIs" />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="city" label="City" optional defaultValue={values.city} error={err("city")} maxLength={80} placeholder="Lahore" autoComplete="address-level2" />
              <TextField
                name="phone"
                label="Phone"
                optional
                type="tel"
                defaultValue={values.phone}
                error={err("phone")}
                maxLength={30}
                autoComplete="tel"
                hint="Masked before any AI step."
              />
              <TextField name="linkedinUrl" label="LinkedIn link" optional type="url" defaultValue={values.linkedinUrl} error={err("linkedinUrl")} placeholder="https://linkedin.com/in/you" />
              <TextField name="githubUrl" label="GitHub link" optional type="url" defaultValue={values.githubUrl} error={err("githubUrl")} placeholder="https://github.com/you" />
              <TextField name="portfolioUrl" label="Portfolio link" optional type="url" defaultValue={values.portfolioUrl} error={err("portfolioUrl")} placeholder="https://you.dev" />
              <TextField name="yearsExperience" label="Years of experience" optional inputMode="numeric" defaultValue={values.yearsExperience} error={err("yearsExperience")} placeholder="3" />
            </div>
            <SelectField
              name="targetMarket"
              label="Where are you applying?"
              defaultValue={values.targetMarket}
              error={err("targetMarket")}
              options={[
                { value: "PK_LOCAL", label: "Pakistan" },
                { value: "INTERNATIONAL", label: "Jobs abroad" },
              ]}
            />
          </>
        )}
      </ItemForm>
    </SectionCard>
  );
}
