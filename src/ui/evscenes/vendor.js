/* Cảnh sự kiện ??? STREET VENDOR (sạp hàng rong) — khung chung + quy ước: src/ui/evscene.js · cách diễn: docs/ux-screens/screens/event-scenes.json
 * (bản tạm: chỉ có nền, chờ vẽ cảnh) */
(function () {
  SFC.EvScene.add('vendor', {
    paint(k) { k.street({ lamp: 290 }); },
  });
})();
