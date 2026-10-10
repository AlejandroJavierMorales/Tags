export function calculateRacketMatch(format, rawSets) {
    const bestOf=Math.max(1,Number(format.best_of_sets||3)),setsToWin=Math.floor(bestOf/2)+1,maxSets=bestOf,sets=(Array.isArray(rawSets)?rawSets:[]).slice(0,maxSets),decidingIndex=maxSets-1;
    let setsA=0,setsB=0,gamesA=0,gamesB=0;
    const normalized=[];
    for(let index=0;index<sets.length;index++){
        if(setsA>=setsToWin||setsB>=setsToWin)return{ok:false,error:"Se cargaron sets posteriores a la definición del partido"};
        if(index===decidingIndex&&format.deciding_set_mode==="none")return{ok:false,error:"Este formato no permite un set decisivo"};
        const a=Number(sets[index]?.scoreA),b=Number(sets[index]?.scoreB),deciding=index===decidingIndex&&format.deciding_set_mode==="super_tiebreak",type=deciding?"super_tiebreak":"conventional";
        if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a===b)return{ok:false,error:`Resultado inválido en el set ${index+1}`};
        if(deciding){const target=Math.max(1,Number(format.deciding_tiebreak_points||10));if(Math.max(a,b)<target||Math.abs(a-b)<2)return{ok:false,error:`El súper tie-break debe llegar a ${target} con dos puntos de diferencia`};}
        else{const target=Math.max(1,Number(format.games_to_win_set||6)),difference=Math.max(1,Number(format.minimum_game_difference||2)),tieAt=Number(format.tiebreak_at_games??target),hasTiebreak=Number(format.tiebreak_enabled)===1,tieBreak=hasTiebreak&&Math.max(a,b)===tieAt+1&&Math.min(a,b)===tieAt,regular=Math.max(a,b)>=target&&Math.abs(a-b)>=difference&&(!hasTiebreak||Math.max(a,b)<=tieAt+1);if(!tieBreak&&!regular)return{ok:false,error:`El set ${index+1} no cumple la regla de games`};gamesA+=a;gamesB+=b;}
        const winner=a>b?"A":"B";if(winner==="A")setsA++;else setsB++;normalized.push({setNumber:index+1,setType:type,scoreA:a,scoreB:b,tiebreakScoreA:sets[index]?.tiebreakScoreA==null?null:Number(sets[index].tiebreakScoreA),tiebreakScoreB:sets[index]?.tiebreakScoreB==null?null:Number(sets[index].tiebreakScoreB),winnerSide:winner});
    }
    if(setsA<setsToWin&&setsB<setsToWin)return{ok:false,error:`El partido requiere ${setsToWin} sets ganados`};
    return{ok:true,sets:normalized,setsA,setsB,gamesA,gamesB,winnerSide:setsA>setsB?"A":"B"};
}
