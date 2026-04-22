
body { font-size: 9.3pt; color: #fff; background-color: #111; margin: 0; padding: 0; height: 100%; font-family: "±¼¸²", Gulim, "Apple SD Gothic Neo", sans-serif; text-align: center; cursor: default; }

#main { position: relative; width: 900px; background-color: #000; border-left: 1px solid #999; border-right: 1px solid #999; min-height: 100%; margin: 0 auto; }
#main > #main { border: none; }
#header { width: 100%; height: 24px; line-height: 24px; border-bottom: 1px solid #999; background-color: #222; }
#footer { position: absolute; left: -1px; bottom: -108px; height: 108px; line-height: 24px; width: 100%; border: 1px solid #999; background-color: #222; }
#topmenu { width: 100%; height: 20px; line-height: 20px; border-bottom: 1px solid #666; background-color: #111; }

#alimiContainer { position: absolute; width: 96px; top: 64px; right: -120px; z-index: 100; pointer-events: none; }
#alimiContainer table { pointer-events: auto; }
#alimiContainer td { width: 96px; padding: 3px; border: none; pointer-events: auto; }
#alimiButton { position: absolute; top: 3px; right: 5px; cursor: pointer; transition: all 0.2s ease; pointer-events: auto; }
#alimiButton:hover { color: #666; }

#infoContainer { position: absolute; width: 320px; height: 96px; background-color: #000; z-index: 1000; opacity: 0; border: 1px solid #fff; border-radius: 5px; pointer-events: none; }

#macroChecker { position: absolute; top: 64px; left: 130px; width: 640px; height: 48px; background-color: #000; border: 1px dashed #ff0000; opacity: 0.8; padding-top: 6px; cursor: pointer; transition: all 0.2s ease; }
#macroChecker:hover { background-color: #333300; border: 1px dashed #ffff00; opacity: 0.9; }

#sideMenu { position: absolute; left: -128px; }
.sideMenu { width: 96px; height: 24px; margin-bottom: 8px; line-height: 24px; text-shadow: 1px 1px 0px #000; border-radius: 2px; background: linear-gradient(to right, #999 0%, #222 75%); cursor: pointer; transition: all 0.2s ease; }
.sideMenu:hover { background: linear-gradient(to right, #ccc 0%, #333 75%); }
.sideMenu_spr { width: 96px; height: 12px; }

::-webkit-scrollbar { width: 8px; height: 8px; border: 3px solid #fff; }
::-webkit-scrollbar-track { background: #efefef; border-radius: 10px; box-shadow: inset 0 0 4px rgba(0,0,0,.2); }
::-webkit-scrollbar-thumb { height: 50px; width: 50px; background: rgba(0,0,0,.2); border-radius: 8px; box-shadow: inset 0 0 4px rgba(0,0,0,.1); }

a { text-decoration: none; cursor: pointer; transition: all 0.2s ease; }
a:link, a:visited { font-size: inherit; color: #fff; text-decoration: none; }
a:active { font-size: inherit; color: #fff; text-decoration: none; transform: translateY(1px); }
a:hover { color: #666; text-decoration: none; }

table { border: 1px solid #fff; margin: 0 auto; border-radius: 2px; }
td { font-size: 9.3pt; color: #fff; border: 0; padding: 5px; text-align: center; }
td[onclick], tr[onclick], span[onclick] { cursor: pointer; transition: all 0.2s ease; }

input { color: #fff; font-size: 12px; background-color: #222; border: 1px solid #666; border-radius: 2px; cursor: text; }
input[type="checkbox"], input[type="radio"] { background-color: #000; cursor: pointer; }
input[type="submit"], input[type="button"] { padding: 2px 10px; border: 1px solid #999; cursor: pointer; transition: all 0.2s ease; }
input[type="submit"]:hover, input[type="button"]:hover { background-color: #444; }
select { color: #fff; background-color: #111; appearance: none; cursor: pointer; }

.topline { background-color: #333; transition: all 0.2s ease; }
.topline:hover { background-color: #333; }
.midline { background-color: #222; transition: all 0.2s ease; }
.midline:hover { background-color: #222; }
.dgline { background-color: #003300; transition: all 0.2s ease; }
.dgline:hover { background-color: #003300; }
.lalign { text-align: left; }

.button { position: absolute; width: 64px; height: 24px; line-height: 24px; background-color: #333; text-shadow: 1px 1px 0px #000; border: 1px solid #999; border-radius: 2px; cursor: pointer; transition: all 0.2s ease; }
.button:hover { background-color: #666; }
.button_common { position: absolute; cursor: pointer; left: 46%; width: auto; height: auto; padding-left: 6px; padding-right: 6px; line-height: 20px; background-color: #333; text-shadow: 1px 1px 0px #000; border: 1px solid #999; border-radius: 2px; transition: all 0.2s ease; }
.button_common:hover { background-color: #666; }

.button:active, .button_common:active, .sideMenu:active, input[type="submit"]:active, input[type="button"]:active, td[onclick]:active, tr[onclick]:active, span[onclick]:active, #alimiButton:active { transform: translateY(1px); }

#button0 { right: 20px; top: 60px; }#button1 { right: 20px; top: 95px; }#button2 { right: 20px; top: 130px; }#button3 { right: 20px; top: 165px; }#button4 { right: 20px; top: 200px; }#button5 { right: 20px; top: 235px; }#button6 { right: 20px; top: 270px; }#button7 { right: 20px; top: 305px; }#button8 { right: 20px; top: 340px; }#button9 { right: 20px; top: 375px; }#button10 { right: 20px; top: 410px; }#button11 { right: 20px; top: 445px; }#button12 { right: 20px; top: 480px; }#button13 { right: 20px; top: 515px; }#button14 { right: 20px; top: 550px; }