"use client";

import { deleteCertification, saveCertification } from "@/app/app/profile/actions";
import { CrudList } from "./crud-list";
import type { CertificationDto } from "./dto";
import { TextField } from "./fields";
import { SectionCard } from "./section-card";

export function CertificationsSection({ items }: { items: CertificationDto[] }) {
  return (
    <SectionCard id="certifications" title="Certifications">
      <CrudList
        items={items.map((c) => ({
          id: c.id,
          label: `certification ${c.name}`,
          values: c,
          view: (
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold">{c.name}</h3>
              {c.issuer && <p className="text-sm text-muted">{c.issuer}</p>}
              {(c.issuedLabel || c.expiresLabel) && (
                <p className="text-sm text-muted">
                  {c.issuedLabel && `Issued ${c.issuedLabel}`}
                  {c.issuedLabel && c.expiresLabel && " · "}
                  {c.expiresLabel && `Expires ${c.expiresLabel}`}
                </p>
              )}
              {c.credentialUrl && (
                <a href={c.credentialUrl} target="_blank" rel="noreferrer noopener" className="break-all text-sm font-semibold text-hl-ink underline-offset-4 hover:underline">
                  View credential
                </a>
              )}
            </div>
          ),
        }))}
        save={saveCertification}
        del={deleteCertification}
        addLabel="Add a certification"
        empty="No certifications yet."
        fields={(v, err) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="name" label="Certification" required maxLength={160} defaultValue={v?.name} error={err("name")} />
            <TextField name="issuer" label="Issued by" optional maxLength={120} defaultValue={v?.issuer} error={err("issuer")} />
            <TextField name="issuedAt" label="Issued month" optional type="month" defaultValue={v?.issuedAt} error={err("issuedAt")} hint="Format: 2024-03" />
            <TextField name="expiresAt" label="Expires month" optional type="month" defaultValue={v?.expiresAt} error={err("expiresAt")} hint="Leave empty if it does not expire." />
            <TextField className="sm:col-span-2" name="credentialUrl" label="Credential link" optional type="url" defaultValue={v?.credentialUrl} error={err("credentialUrl")} />
          </div>
        )}
      />
    </SectionCard>
  );
}
