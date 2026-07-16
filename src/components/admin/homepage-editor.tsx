"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LayoutList, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { Locale } from "@/config/site";
import { emptyLocalized } from "@/lib/i18n";
import { DEFAULT_SECTION_VISIBILITY } from "@/lib/constants";
import {
  deleteTestimonial,
  saveTestimonial,
  updateHomepageContent,
} from "@/lib/actions/homepage";
import type { HeroSection, HomepageContent, Testimonial } from "@/types/database";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ImageUpload } from "@/components/admin/image-upload";
import { LocaleTabs, LocalizedInput } from "@/components/admin/locale-fields";
import { MultiImageUpload } from "@/components/admin/multi-image-upload";
import { useAdminT, useDirection } from "@/hooks";
import { useSubmitLock } from "@/hooks/use-submit-lock";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type HomepageEditorProps = {
  homepage: HomepageContent | null;
  testimonials: Testimonial[];
};

type TestimonialDraft = {
  id: string;
  isNew?: boolean;
  author_i18n: Record<Locale, string>;
  content_i18n: Record<Locale, string>;
  role_i18n: Record<Locale, string>;
  image_url: string;
  sort_order: number;
  is_active: boolean;
};

function normalizeHeroLocale(
  item?: Partial<HeroSection> | null,
): HeroSection {
  const fromList = (item?.images ?? []).filter(Boolean).slice(0, 8);
  const images =
    fromList.length > 0
      ? fromList
      : item?.image_url
        ? [item.image_url]
        : [];

  return {
    title: item?.title ?? "",
    subtitle: item?.subtitle ?? "",
    description: item?.description,
    cta_primary: item?.cta_primary ?? "",
    cta_secondary: item?.cta_secondary ?? "",
    cta_contact: item?.cta_contact,
    images,
    image_url: images[0] ?? "",
  };
}

const defaultHero = (): Record<Locale, HeroSection> => ({
  ku: normalizeHeroLocale(),
  ar: normalizeHeroLocale(),
  en: normalizeHeroLocale(),
});

function normalizeHeroRecord(
  hero?: HomepageContent["hero"] | null,
): Record<Locale, HeroSection> {
  if (!hero) return defaultHero();
  return {
    ku: normalizeHeroLocale(hero.ku),
    ar: normalizeHeroLocale(hero.ar),
    en: normalizeHeroLocale(hero.en),
  };
}

const defaultAbout = () => ({
  ku: { title: "", content: "", image_url: "" },
  ar: { title: "", content: "", image_url: "" },
  en: { title: "", content: "", image_url: "" },
});

function toDraft(item: Testimonial): TestimonialDraft {
  return {
    id: item.id,
    author_i18n: {
      ku: item.author_i18n?.ku ?? "",
      ar: item.author_i18n?.ar ?? "",
      en: item.author_i18n?.en ?? "",
    },
    content_i18n: {
      ku: item.content_i18n?.ku ?? "",
      ar: item.content_i18n?.ar ?? "",
      en: item.content_i18n?.en ?? "",
    },
    role_i18n: {
      ku: item.role_i18n?.ku ?? "",
      ar: item.role_i18n?.ar ?? "",
      en: item.role_i18n?.en ?? "",
    },
    image_url: item.image_url ?? "",
    sort_order: item.sort_order,
    is_active: item.is_active,
  };
}

export function HomepageEditor({
  homepage,
  testimonials,
}: HomepageEditorProps) {
  const t = useAdminT();
  const router = useRouter();
  const { direction } = useDirection();
  const { runLocked, isLocked } = useSubmitLock({
    duplicateMessage: t("common.please_wait"),
  });
  const [tab, setTab] = useState<Locale>("ku");
  const [isPending, startTransition] = useTransition();
  const isBusy = isPending || isLocked;
  const [testimonialDrafts, setTestimonialDrafts] = useState<TestimonialDraft[]>(
    () => testimonials.map(toDraft),
  );
  const [hero, setHero] = useState(() => normalizeHeroRecord(homepage?.hero));
  const [about, setAbout] = useState(homepage?.about ?? defaultAbout());
  const [why, setWhy] = useState(
    homepage?.why_choose_us ?? {
      ku: { title: "", items: [] },
      ar: { title: "", items: [] },
      en: { title: "", items: [] },
    },
  );

  const saveHomepage = () => {
    startTransition(async () => {
      await runLocked(async () => {
        const result = await updateHomepageContent({
          hero: normalizeHeroRecord(hero),
          about,
          why_choose_us: why,
          section_visibility:
            homepage?.section_visibility ?? DEFAULT_SECTION_VISIBILITY,
          section_manager: homepage?.section_manager,
        });
        if (result.success) {
          toast.success(t("common.saved"));
          router.refresh();
        } else {
          toast.error(result.error);
        }
      });
    });
  };

  return (
    <div className="space-y-6" dir={direction}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AdminPageHeader
          titleKey="pages.homepage.title"
          subtitleKey="pages.homepage.subtitle"
        />
        <LocaleTabs activeLocale={tab} onChange={setTab} />
      </div>

      <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>{t("homepage.visibility")}</CardTitle>
          <CardDescription>{t("section_visibility.homepage_link_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ButtonLink
            href="/admin/section-visibility"
            className="rounded-xl"
          >
            <LayoutList className="size-4" />
            {t("section_visibility.open_manager")}
          </ButtonLink>
        </CardContent>
      </Card>

      <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>{t("homepage.hero")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>
              {t("common.title")} ({tab})
            </Label>
            <Input
              dir={tab === "en" ? "ltr" : "rtl"}
              value={hero[tab]?.title ?? ""}
              onChange={(e) =>
                setHero((prev) => ({
                  ...prev,
                  [tab]: { ...prev[tab], title: e.target.value },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{t("homepage.subtitle")}</Label>
            <Textarea
              dir={tab === "en" ? "ltr" : "rtl"}
              value={hero[tab]?.subtitle ?? ""}
              onChange={(e) =>
                setHero((prev) => ({
                  ...prev,
                  [tab]: { ...prev[tab], subtitle: e.target.value },
                }))
              }
            />
          </div>
          <MultiImageUpload
            value={hero[tab]?.images ?? []}
            max={8}
            folder="homepage"
            onChange={(urls) =>
              setHero((prev) => ({
                ...prev,
                [tab]: {
                  ...prev[tab],
                  images: urls,
                  image_url: urls[0] ?? "",
                },
              }))
            }
          />
        </CardContent>
      </Card>

      <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>{t("homepage.about")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>{t("common.title")}</Label>
            <Input
              dir={tab === "en" ? "ltr" : "rtl"}
              value={about[tab]?.title ?? ""}
              onChange={(e) =>
                setAbout((prev) => ({
                  ...prev,
                  [tab]: { ...prev[tab], title: e.target.value },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{t("homepage.content")}</Label>
            <Textarea
              dir={tab === "en" ? "ltr" : "rtl"}
              rows={5}
              value={about[tab]?.content ?? ""}
              onChange={(e) =>
                setAbout((prev) => ({
                  ...prev,
                  [tab]: { ...prev[tab], content: e.target.value },
                }))
              }
            />
          </div>
          <ImageUpload
            value={about[tab]?.image_url}
            onChange={(url) =>
              setAbout((prev) => ({
                ...prev,
                [tab]: { ...prev[tab], image_url: url ?? "" },
              }))
            }
            folder="homepage"
          />
        </CardContent>
      </Card>

      <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>{t("homepage.why_us")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            dir={tab === "en" ? "ltr" : "rtl"}
            placeholder={t("homepage.section_title")}
            value={why[tab]?.title ?? ""}
            onChange={(e) =>
              setWhy((prev) => ({
                ...prev,
                [tab]: { ...prev[tab], title: e.target.value },
              }))
            }
          />
          {(why[tab]?.items ?? []).map((item, index) => (
            <div
              key={index}
              className="border-border space-y-2 rounded-xl border p-3"
            >
              <Input
                dir={tab === "en" ? "ltr" : "rtl"}
                placeholder={t("homepage.item_title")}
                value={item.title}
                onChange={(e) => {
                  const items = [...(why[tab]?.items ?? [])];
                  items[index] = { ...items[index], title: e.target.value };
                  setWhy((prev) => ({
                    ...prev,
                    [tab]: { ...prev[tab], items },
                  }));
                }}
              />
              <Textarea
                dir={tab === "en" ? "ltr" : "rtl"}
                placeholder={t("common.description")}
                value={item.description}
                onChange={(e) => {
                  const items = [...(why[tab]?.items ?? [])];
                  items[index] = {
                    ...items[index],
                    description: e.target.value,
                  };
                  setWhy((prev) => ({
                    ...prev,
                    [tab]: { ...prev[tab], items },
                  }));
                }}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() =>
              setWhy((prev) => ({
                ...prev,
                [tab]: {
                  ...prev[tab],
                  items: [
                    ...(prev[tab]?.items ?? []),
                    { title: "", description: "" },
                  ],
                },
              }))
            }
          >
            <Plus className="size-4" /> {t("homepage.add_item")}
          </Button>
        </CardContent>
      </Card>

      <TestimonialsEditor
        drafts={testimonialDrafts}
        setDrafts={setTestimonialDrafts}
        runLocked={runLocked}
        isLocked={isLocked}
      />

      <Button
        size="lg"
        disabled={isBusy}
        onClick={saveHomepage}
        className="rounded-xl"
      >
        {isBusy ? <Loader2 className="size-4 animate-spin" /> : null}
        {isBusy ? t("common.saving") : t("homepage.save_homepage")}
      </Button>
    </div>
  );
}

function TestimonialsEditor({
  drafts,
  setDrafts,
  runLocked,
  isLocked,
}: {
  drafts: TestimonialDraft[];
  setDrafts: React.Dispatch<React.SetStateAction<TestimonialDraft[]>>;
  runLocked: ReturnType<typeof useSubmitLock>["runLocked"];
  isLocked: boolean;
}) {
  const t = useAdminT();
  const [isPending, startTransition] = useTransition();
  const isBusy = isPending || isLocked;

  const updateDraft = (id: string, patch: Partial<TestimonialDraft>) => {
    setDrafts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const addDraft = () => {
    setDrafts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        isNew: true,
        author_i18n: emptyLocalized(),
        content_i18n: emptyLocalized(),
        role_i18n: emptyLocalized(),
        image_url: "",
        sort_order: prev.length,
        is_active: true,
      },
    ]);
  };

  const saveDraft = (draft: TestimonialDraft) => {
    const formData = new FormData();
    if (!draft.isNew) formData.append("id", draft.id);
    formData.append("author_i18n", JSON.stringify(draft.author_i18n));
    formData.append("content_i18n", JSON.stringify(draft.content_i18n));
    formData.append("role_i18n", JSON.stringify(draft.role_i18n));
    formData.append("image_url", draft.image_url);
    formData.append("sort_order", String(draft.sort_order));
    formData.append("is_active", String(draft.is_active));

    startTransition(async () => {
      await runLocked(async () => {
        const result = await saveTestimonial(formData);
        if (result.success && result.data) {
          toast.success(t("common.saved"));
          setDrafts((prev) =>
            prev.map((item) =>
              item.id === draft.id
                ? { ...toDraft(result.data!), isNew: false }
                : item,
            ),
          );
        } else if (!result.success) {
          toast.error(result.error);
        }
      });
    });
  };

  const removeDraft = (draft: TestimonialDraft) => {
    if (!confirm(t("common.confirm_delete"))) return;

    if (draft.isNew) {
      setDrafts((prev) => prev.filter((item) => item.id !== draft.id));
      return;
    }

    startTransition(async () => {
      await runLocked(async () => {
        const result = await deleteTestimonial(draft.id);
        if (result.success) {
          toast.success(t("common.deleted"));
          setDrafts((prev) => prev.filter((item) => item.id !== draft.id));
        } else {
          toast.error(result.error);
        }
      });
    });
  };

  return (
    <Card className="border-border/40 rounded-2xl shadow-sm">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{t("homepage.testimonials")}</CardTitle>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl"
          onClick={addDraft}
        >
          <Plus className="size-4" /> {t("common.add")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {drafts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("common.no_items")}
          </p>
        ) : (
          drafts.map((draft) => (
            <div
              key={draft.id}
              className="border-border space-y-3 rounded-xl border p-4"
            >
              <LocalizedInput
                label={t("homepage.author")}
                value={draft.author_i18n}
                onChange={(author_i18n) =>
                  updateDraft(draft.id, { author_i18n })
                }
              />
              <LocalizedInput
                label={t("homepage.content")}
                multiline
                value={draft.content_i18n}
                onChange={(content_i18n) =>
                  updateDraft(draft.id, { content_i18n })
                }
              />
              <LocalizedInput
                label={t("homepage.role")}
                value={draft.role_i18n}
                onChange={(role_i18n) => updateDraft(draft.id, { role_i18n })}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="rounded-xl"
                  disabled={isBusy}
                  onClick={() => saveDraft(draft)}
                >
                  {isBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  {isBusy ? t("common.saving") : t("homepage.save_testimonial")}
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={isBusy}
                  onClick={() => removeDraft(draft)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
