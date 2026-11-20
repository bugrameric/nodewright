---
name: graph-problem-solver
description: "Kullanıcı karmaşık bir karar, proje veya otomasyon fikrini düğüm ve bağımlılık grafiği olarak görmek istediğinde Graf JSON üretir veya günceller. Basit planlama ve sıradan diyagram isteklerinde kullanılmaz."
---

# Graf ile problem çözme

Karmaşık bir problemi gerçekler, kararlar, görevler ve riskler arasındaki bağlantılarla görünür kıl. Kullanıcının amacını, elindeki verileri ve belirsizlikleri önce mevcut konuşmadan çıkar. Eksik bilgi grafiğin temel yönünü değiştiriyorsa kısa bir soru sor; aksi halde varsayımı belirt.

## Çıktı

Kullanıcı graf istediğinde sohbet içinde geçerli bir `json` kod bloğu ver. Şu şema, kullanıcının mevcut graf uygulamasıyla çalışmak için başlangıç noktasıdır:

```json
{
  "nodes": [
    { "id": "F1", "label": "Doğrulanmış gerçek", "type": "fact", "x": 100, "y": 100 },
    { "id": "D1", "label": "Verilecek karar", "type": "decision", "x": 380, "y": 100 },
    { "id": "T1", "label": "Sonraki iş", "type": "task", "x": 660, "y": 100 },
    { "id": "R1", "label": "Önemli risk", "type": "risk", "x": 660, "y": 260 }
  ],
  "edges": [
    { "from": "F1", "to": "D1" },
    { "from": "D1", "to": "T1" },
    { "from": "D1", "to": "R1" }
  ]
}
```

`id` değerleri benzersiz olsun; her kenarın iki ucu mevcut düğüme bağlansın. `type` değerlerini `fact`, `decision`, `task` veya `risk` arasından seç. Büyük problemlerde daha çok düğüm ve bağlantı kullan; sırf şablonu doldurmak için düğüm ekleme.

Doğrulanmış bilgiyle varsayımı karıştırma. Varsayımları kısa açıklamada belirt veya kullanıcıyla birlikte doğrulanacak karar düğümü olarak göster. Kullanıcının graf uygulamasının içe aktarma şeması farklıysa, uygulamanın verdiği şemayı izle. Uygulama veya düğme adını mevcut konuşmada doğrulanmadıkça varsayma.

JSON'un ardından en önemli kararları, bağımlılıkları ve riskleri kısa bir açıklamayla belirt. Kullanıcı yalnızca JSON isterse açıklama ekleme.

## Grafın devamı

Kullanıcı uygulamada düğümlere veri ekleyip geri gönderirse yeni veriyi mevcut grafla eşleştir; değişen varsayımları, darboğazları ve bir sonraki kararı açıkla. Kullanıcı uygulama kullanmıyorsa grafı sohbette gözden geçirip güncelle. Kod veya otomasyon uygulaması ayrıca istenirse mevcut araçlarla, kullanıcının verdiği yetki ve proje sınırları içinde yap.
