"""splice the restored scene block back into scenes_pd.js (replaces the unused pd_clash_meteor and everything after it)"""
import shutil
P = 'scenes_pd.js'
shutil.copy(P, 'scratchpad/pd/scenes_pd.before_restore.js')
s = open(P, encoding='utf-8').read()
s = s.replace("""    /* B24 round 1: bigboss99 goes TITAN with the ball; tuanbeo answers with HUNDRED FISTS... 20 HIT, the giant doesn't move,
       then walks through him (BONK) */""", """    /* B24 CLASH: tuanbeo (YOU) goes TITAN with the ball; bigboss99 answers with HUNDRED FISTS... 20 HIT, the giant doesn't
       move (Titan is stun immune), then walks through him (BONK) */""")
s = s.replace("""    /* B22 KICKOFF BRAWL: whistle, NGH taps it forward... and all six forget the ball: a punch-up in the centre circle while
       the ball rolls on its own into the empty net */""", """    /* B22 KICKOFF BRAWL: whistle, NGH taps it forward... and all six forget the ball: a punch-up in the centre circle while
       the tap trickles all the way into the empty net (a real kick on ground friction; nobody is in the box, so nobody keeps) */""")
a = s.index("    /* B24 round 2: bigboss99 TITAN in his own box")
block = open('scratchpad/pd/restore_block.js', encoding='utf-8').read()
open(P, 'w', encoding='utf-8').write(s[:a] + block)
print('ok')
