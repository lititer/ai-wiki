"use client";

import Link from "next/link";
import {
  BookOpen,
  Search,
  MessageSquareQuote,
  Sparkles,
  ArrowRight,
  Zap,
  Brain,
  Link as LinkIcon,
} from "lucide-react";
import { Button, Card, CardContent } from "@/components/ui";
import { useLanguage } from "@/components/providers/language-provider";

export default function Home() {
  const { t } = useLanguage();

  const features = [
    {
      icon: MessageSquareQuote,
      title: t("home.features.qa.title"),
      description: t("home.features.qa.description"),
      href: "/ask",
      color: "bg-blue-500",
    },
    {
      icon: Sparkles,
      title: t("home.features.compile.title"),
      description: t("home.features.compile.description"),
      href: "/compile",
      color: "bg-emerald-500",
    },
    {
      icon: Search,
      title: t("home.features.search.title"),
      description: t("home.features.search.description"),
      href: "/search",
      color: "bg-amber-500",
    },
    {
      icon: Brain,
      title: t("home.features.writing.title"),
      description: t("home.features.writing.description"),
      href: "/pages/new",
      color: "bg-rose-500",
    },
  ];

  const stats = [
    { label: t("home.stats.pages"), value: "0", icon: BookOpen },
    { label: t("home.stats.concepts"), value: "0", icon: Brain },
    { label: t("home.stats.references"), value: "0", icon: LinkIcon },
    { label: t("home.stats.queries"), value: "0", icon: Zap },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section - Clean, minimal */}
      <section className="relative bg-white">
        <div className="w-full px-6 sm:px-8 lg:px-12 py-20 lg:py-28">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              {t("home.hero.badge")}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              {t("home.hero.title")}
            </h1>
            <p className="text-xl text-gray-600 mx-auto mb-10 leading-relaxed text-balance">
              {t("home.hero.description")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/pages">
                <Button size="lg" className="gap-2">
                  <BookOpen className="w-5 h-5" />
                  {t("home.hero.browsePages")}
                </Button>
              </Link>
              <Link href="/ask">
                <Button variant="outline" size="lg" className="gap-2">
                  <MessageSquareQuote className="w-5 h-5" />
                  {t("home.hero.askQuestion")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gray-50 border-y border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-gray-200 mb-3">
                    <Icon className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="w-full px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t("home.features.title")}
            </h2>
            <p className="text-lg text-gray-600 mx-auto text-balance">
              {t("home.features.description")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link key={feature.title} href={feature.href}>
                  <Card
                    variant="hover"
                    className="h-full cursor-pointer group hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center flex-shrink-0`}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                            {feature.title}
                          </h3>
                          <p className="text-sm text-gray-500 mb-3 leading-relaxed">
                            {feature.description}
                          </p>
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600">
                            {t("home.features.tryNow")}
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-100 border-t border-gray-200">
        <div className="w-full px-6 sm:px-8 lg:px-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {t("home.cta.title")}
          </h2>
          <p className="text-gray-600 mx-auto mb-6 text-balance">
            {t("home.cta.description")}
          </p>
          <Link href="/pages/new">
            <Button size="lg" className="gap-2">
              <BookOpen className="w-5 h-5" />
              {t("home.cta.button")}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
