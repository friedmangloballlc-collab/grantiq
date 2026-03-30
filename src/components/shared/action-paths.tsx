import { Pencil, Sparkles, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ActionPaths({ grantId }: { grantId: string }) {
  const paths = [
    { icon: Pencil, title: "DIY", desc: "Templates and checklists to write it yourself.", tier: "Free", action: "Get Templates", href: "#" },
    { icon: Sparkles, title: "AI-Assisted", desc: "AI drafts it, you review and edit.", tier: "Pro", action: "Start AI Draft", href: `/grants/${grantId}/write` },
    { icon: Users, title: "Expert Review", desc: "A grant expert reviews your application.", tier: "Premium", action: "Get Expert Help", href: "#" },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {paths.map((path) => (
        <Card key={path.title} className="border-warm-200 dark:border-warm-800 hover:border-brand-teal/50 transition-colors">
          <CardContent className="p-4 text-center">
            <path.icon className="h-8 w-8 mx-auto text-brand-teal mb-2" />
            <h4 className="font-semibold text-warm-900 dark:text-warm-50">{path.title}</h4>
            <p className="text-xs text-warm-500 mt-1">{path.desc}</p>
            <Button size="sm" className="mt-3 w-full bg-brand-teal hover:bg-brand-teal-dark text-white"
              render={<a href={path.href}>{path.action}</a>} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
