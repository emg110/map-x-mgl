webpackJsonp([27],{98:function(a,e){a.exports=function(a){var e="",t=mx.helpers;e+="<div> ";var i=t.path(a,"data.style.rulesCopy")||t.path(a,"data.style.rules");if(e+=" ",t.greaterThan(i.length,0)){e+=" ";var l="point"==t.path(a,"data.geometry.type");e+=" ";var r="line"==t.path(a,"data.geometry.type");e+=" ";t.path(a,"data.geometry.type");e+=" ";var d="string"!==t.path(a,"data.attribute.type");e+=" <ul> ";var o=i;if(o)for(var n,v=-1,c=o.length-1;v<c;){if(n=o[v+=1],e+=" ",n){e+=" ";var s=t.checkLanguage({obj:n,path:"label_",concat:!0});e+=" ";var p=t.firstOf([n["label_"+s],n.value]);e+=' <li> <div class="mx-legend-item-container"> <input type="checkbox" data-view_action_key="btn_legend_filter" data-view_action_target="'+a.id+'" data-view_action_value="'+n.value+'" data-view_action_variable="'+a.data.attribute.name+'" name="'+a.id+"_"+n.value+'" id="'+a.id+"_"+n.value+'"/> <div class="mx-legend-item-arrow"> ',e+=d?" ≥ ":" = ",e+=' </div> <label for="'+a.id+"_"+n.value+'"> <div class="mx-legend-item-color-container" style="opacity:'+n.opacity+';"> <div class="mx-legend-item-color" style="',r&&(e+="height:"+2*n.size+"px;"),l&&(e+="width:"+2*Math.log(0+10*n.size)+"px;height:"+2*Math.log(0+10*n.size)+"px;border-radius:100%;"),e+="background-color:"+n.color+";",n.sprite&&(e+="background-image:"+n.sprite+";"),e+='"></div> </div> <div class="mx-legend-item-label" title="'+p+'">'+p+"</div> </label> </div> </li> "}e+=" "}e+=" </ul> "}return e+="</div>"}}});