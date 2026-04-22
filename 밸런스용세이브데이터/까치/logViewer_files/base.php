  
function isArray(arg){return Object.prototype.toString.call(arg)=='[object Array]';}  
function shiftPage(a){location.replace("./"+a+".php");}	
function formSubmit(vari,val){var a=document.createElement("form");a.method="post";a.action="#";var b=document.createElement("input");b.name=vari;b.value=val;b.style.display="none";a.appendChild(b);document.body.appendChild(a);a.submit();}
function formSubmitTo(vari,val,url){var a=document.createElement("form");a.method="post";a.action=url+".php";var b=document.createElement("input");b.name=vari;b.value=val;b.style.display="none";a.appendChild(b);document.body.appendChild(a);a.submit();}
function submitForms(vars,vals,url){
	var a=document.createElement("form");
	a.method="post";
	a.action="#";
	i = 0;
	for(var vari in vars){
		var b=document.createElement("input");
		b.name=vari;
		b.value=vals[i];
		b.style.display="none";
		a.appendChild(b);
		i++;
	}
	document.body.appendChild(a);
	a.submit();
}
function waitOver(){loadPage("logout");}
//function catchInput(input){if(window.event){key=window.event.keyCode;}else if(input){key=input.which;}if(key==8||key==116){if(window.event){event.returnValue=false;}else{e.preventDefault();}}}
function toggleAlimi(){var on=alimiDisplayer.style.display=="none"?1:0;alimiButton.innerHTML = on==1?"△":"▽";alimiDisplayer.style.display = on==1?"block":"none";setCookie("isRPG_alimiDisplay",on,365);}
function setCookie(name,val,exh){var exhdate=new Date();exhdate.setDate(exhdate.getDate()+exh);document.cookie=name+"="+escape(val)+((exhdate==null)?"":"; expires="+exhdate.toUTCString());}
function refreshWP(){
	if(nowWP<maxWP){
		nowWP++;
		if(document.getElementById("alimiWkpDisp")){
			alimiWkpDisp.innerHTML = nowWP;
			timer = setTimeout("refreshWP()",10000);
		}
	}
}
if(logoutTimer){clearTimeout(logoutTimer);}
var logoutTimer = setTimeout("waitOver()",1200000);
/*document.onkeydown = catchInput;

document.oncontextmenu=function(){return false;}
document.ondragstart=function(){return false;}
document.onselectstart=function(){return false;}*/

function loadPage(url,arg){$("#main").load("./"+url+".php",arg);}

const statTooltip = {
	"hp":"HP(체력)<br><br>생명력을 기반으로 MHP(최대 체력)가 정해진다.<br>HP n% 는 (MHP * n/100)만큼의 NHP(현재 체력)를 의미한다.<br><br>상시 적용되는 효과의 HP 증감은<br>기본 HP에 대한 %p 증감이다.<br><br>기본 HP = 현재 생명력과 최대 생명력 중 낮은 값",
	"pa":"PA(물리 공격력)<br><br>주로 대미지의 기반이 되는 스탯이다.<br><br>상시 적용되는 효과의 PA 증감은<br>기본 PA에 대한 %p 증감이다.<br><br>기본 PA = STR",
	"ma":"MA(마법 공격력)<br><br>주로 대미지의 기반이 되는 스탯이다.<br><br>상시 적용되는 효과의 MA 증감은<br>기본 MA에 대한 %p 증감이다.<br><br>기본 MA = WIS",
	"pd":"PD(물리 방어력)<br><br>PDMG(물리 대미지)를 받을 때 PD%만큼 대미지가 감소한다.<br><br>상시 적용되는 효과의 PD 증감은<br>해당 스탯에 대한 단순 합연산이다.<br><br>기본 PD = 0",
	"md":"MD(마법 방어력)<br><br>MDMG(마법 대미지)를 받을 때 MD%만큼 대미지가 감소한다.<br><br>상시 적용되는 효과의 MD 증감은<br>해당 스탯에 대한 단순 합연산이다.<br><br>기본 MD = 0",
	"ct":"CT(치명타)<br><br>CT% 확률로 공격에 CD(치명타 피해)가 적용된다.<br><br>상시 적용되는 효과의 CT 증감은<br>해당 스탯에 대한 단순 합연산이다.<br><br>기본 CT = AGI^0.3",
	"cd":"CD(치명타 피해)<br><br>CD가 적용된 대미지 = (기존 대미지)*CD/100<br><br>상시 적용되는 효과의 CD 증감은<br>해당 스탯에 대한 단순 합연산이다.<br><br>기본 CD = 150",
	"av":"AV(회피)<br><br>AV% 확률로 상대의 공격을 피하여 대미지를 입지 않는다.<br><br>상시 적용되는 효과의 AV 증감은<br>해당 스탯에 대한 단순 합연산이다.<br><br>기본 AV = AGI^0.25",
	"ar":"AR(속도)<br><br>AR이 증가하면 DLY(행동 간격)가 단축된다.<br><br>상시 적용되는 효과의 AR 증감은<br>해당 스탯에 대한 단순 합연산이다.<br><br>기본 AR = 0"
}