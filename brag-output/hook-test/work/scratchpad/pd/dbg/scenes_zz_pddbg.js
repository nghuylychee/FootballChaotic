(function () {
  const B = BRAG;
  B.SCENES.pd_dbg_clash = function () {
    B.SCENES.pd_clash_fists();
    const d0 = B.dir, g = BRAG.lib.app.game, T = g.players.find((p) => p.name === 'tuanbeo');
    let last = '';
    B.dir = (dt, gg, t) => { d0(dt, gg, t); const s = `${T.sizeMul.toFixed(2)}/${T.sizeTarget}/${T.titanT.toFixed(2)}/${(T.sizeT||0).toFixed(2)}/${T.state}`; if (s.split('/').slice(0,3).join() !== last) { last = s.split('/').slice(0,3).join(); B.sfx.push({ t: B.t, name: 'dbg', arg: s }); } };
  };
})();
