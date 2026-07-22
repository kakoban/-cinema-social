"use client";

import { ExternalLink, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PLATFORMS = [
  {
    id: "tubi",
    name: "Tubi",
    url: "https://www.tubitv.com",
    owner: "Fox",
    features: ["50k+ Titles", "Low Ads"],
    description: "یکی از برترین پلتفرم‌های کاملاً رایگان در جهان که بیش از ۵۰ هزار عنوان فیلم و سریال را با کمترین حجم تبلیغات ارائه می‌دهد.",
    color: "bg-orange-500",
  },
  {
    id: "pluto",
    name: "Pluto TV",
    url: "https://www.pluto.tv",
    owner: "Paramount",
    features: ["Live TV", "On-Demand"],
    description: "صدها کانال تلویزیونی خطی زنده و محتوای درخواستی را به صورت رایگان (همراه با پخش پیام بازرگانی) شبیه‌سازی می‌کند.",
    color: "bg-yellow-400 text-black",
  },
  {
    id: "plex",
    name: "Plex",
    url: "https://www.plex.tv",
    owner: "Plex",
    features: ["Live TV", "50k+ Free Movies", "Media Server"],
    description: "علاوه بر قابلیت‌های مدیریت رسانه شخصی، امکان تماشای کاملاً رایگان بیش از ۵۰ هزار فیلم درخواستی و شبکه‌های زنده را فراهم کرده است.",
    color: "bg-amber-500",
  },
  {
    id: "youtube",
    name: "YouTube Movies & TV",
    url: "https://www.youtube.com/feed/storefront",
    owner: "Google",
    features: ["Studio Films", "Ad-supported"],
    description: "بخش Movies & TV در یوتیوب فیلم‌های رسمی استودیوها را به صورت رایگان با پخش تبلیغات ارائه می‌دهد (نیازمند IP آمریکا برای آرشیو کامل).",
    color: "bg-red-600",
  },
  {
    id: "roku",
    name: "The Roku Channel",
    url: "https://therokuchannel.roku.com",
    owner: "Roku",
    features: ["No Registration", "Roku Originals"],
    description: "این سرویس که نیاز به ثبت‌نام اجباری ندارد، هزاران فیلم رایگان و محتوای اوریجینال روکو را برای تماشا در وب ارائه می‌کند.",
    color: "bg-purple-600",
  },
  {
    id: "arte",
    name: "ARTE",
    url: "https://www.arte.tv",
    owner: "France/Germany",
    features: ["Documentaries", "Art-house", "High Quality"],
    description: "یک پلتفرم فرهنگی بسیار باکیفیت اروپایی که مستندهای عمیق، مینی‌سریال‌ها و سینمای هنری را به صورت کاملاً رایگان عرضه می‌کند.",
    color: "bg-orange-600",
  },
  {
    id: "viki",
    name: "Rakuten Viki",
    url: "https://www.viki.com",
    owner: "Rakuten",
    features: ["Asian Dramas", "K-Dramas", "Subtitles"],
    description: "بهترین گزینه برای علاقه‌مندان به درام‌ها و فیلم‌های آسیایی (کره‌ای، چینی، تایوانی و غیره) که محتوای عظیمی را به صورت رایگان با تبلیغات ارائه می‌دهد.",
    color: "bg-blue-500",
  },
  {
    id: "crunchyroll",
    name: "Crunchyroll",
    url: "https://www.crunchyroll.com",
    owner: "Sony",
    features: ["Anime", "Manga", "Ad-supported"],
    description: "بزرگترین و معتبرترین پلتفرم استریم انیمه در جهان که بخش قابل توجهی از محتوای خود را تحت مدل رایگانِ مبتنی بر تبلیغات به مخاطبان ارائه می‌دهد.",
    color: "bg-orange-500",
  },
];

export function PlatformsView() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-3">Free Streaming Platforms</h1>
        <p className="text-muted-foreground text-lg max-w-3xl">
          A curated list of the best 100% legal and free movie and TV streaming platforms in the world.
        </p>
      </div>

      <Card className="p-4 mb-8 bg-yellow-500/10 border-yellow-500/20 flex gap-4 items-start">
        <ShieldAlert className="size-6 text-yellow-500 shrink-0" />
        <div>
          <h3 className="font-semibold text-yellow-500 mb-1">Important Notice / توجه مهم</h3>
          <p className="text-sm text-yellow-500/80 leading-relaxed text-right md:text-left" dir="rtl">
            به دلیل محدودیت‌های جغرافیاییِ این پلتفرم‌ها (Geo-blocking) و همچنین مسدودسازی‌های داخلی، دسترسی به اکثر این سرویس‌ها از داخل ایران نیازمند استفاده از یک ابزار تغییر آی‌پی (VPN) معتبر است.
          </p>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {PLATFORMS.map((platform) => (
          <Card key={platform.id} className="p-6 flex flex-col h-full hover:border-primary/50 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`size-12 rounded-xl flex items-center justify-center font-bold text-lg text-white ${platform.color}`}>
                  {platform.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{platform.name}</h2>
                  <p className="text-sm text-muted-foreground">by {platform.owner}</p>
                </div>
              </div>
              <a 
                href={platform.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-md"
              >
                Visit <ExternalLink className="size-3.5" />
              </a>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {platform.features.map(f => (
                <Badge key={f} variant="secondary" className="bg-secondary/50">{f}</Badge>
              ))}
            </div>
            
            <p className="text-muted-foreground text-sm leading-relaxed mt-auto text-right" dir="rtl">
              {platform.description}
            </p>
          </Card>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground mt-8 text-center">
        Note: Platforms like Amazon Freevee and Crackle are no longer included as they have been shut down or merged in recent years.
      </p>
    </div>
  );
}
