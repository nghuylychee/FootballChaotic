/* Cảnh sự kiện ??? BIGGEST FAN (quà của fan + polaroid) — khung chung + quy ước: src/ui/evscene.js · cách diễn: docs/ux-screens/screens/event-scenes.json
 * (bản tạm: chỉ có nền, chờ vẽ cảnh) */
(function () {
  SFC.EvScene.add('fan', {
    paint(k) { k.street({ lamp: 30 }); },
  });
})();
