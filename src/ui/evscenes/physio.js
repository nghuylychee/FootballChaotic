/* Cảnh sự kiện ??? PARK PHYSIO (bàn trị liệu ngoài công viên) — khung chung + quy ước: src/ui/evscene.js · cách diễn: docs/ux-screens/screens/event-scenes.json
 * (bản tạm: chỉ có nền, chờ vẽ cảnh) */
(function () {
  SFC.EvScene.add('physio', {
    paint(k) { k.street({ sun: false, lamp: 300 }); },
  });
})();
