export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db } from "@/app/lib/tags-db";
import { getGuestPublicSession } from "@/app/modules/guest-experience/lib/getGuestPublicSession";
import { guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";
export async function GET(req) {
    const params=new URL(req.url).searchParams,slug=params.get("slug"),entryId=Number(params.get("entryId")||0),session=await getGuestPublicSession(slug);
    if(!session)return guestError("La sesión venció o no es válida",401);
    const[accounts]=await db.query("SELECT id,currency,status FROM tags_guest_accounts WHERE guest_app_id=? AND stay_id=? LIMIT 1",[session.id,session.stay_id]);
    if(!accounts[0])return Response.json({ok:true,account:null,entries:[],summary:{charges:0,discounts:0,paid:0,balance:0}});
    const account=accounts[0];
    if(entryId){
        const[entryRows]=await db.query(`SELECT e.*,p.payment_method,p.reference,p.notes payment_notes FROM tags_guest_account_entries e LEFT JOIN tags_guest_payments p ON p.account_entry_id=e.id WHERE e.id=? AND e.account_id=? AND e.status='confirmed' LIMIT 1`,[entryId,account.id]);
        const entry=entryRows[0];if(!entry)return guestError("Movimiento no encontrado",404);
        const[links]=await db.query(`SELECT co.*,s.name store_name,so.order_number,so.order_status,so.shipping_status,so.payment_status,rs.status session_status,rs.payment_status resto_payment_status FROM tags_guest_commerce_orders co INNER JOIN tags_stores s ON s.id=co.store_id LEFT JOIN tags_store_orders so ON co.module_type='store' AND so.id=co.external_order_id LEFT JOIN tags_resto_sessions rs ON co.module_type='resto' AND rs.id=co.external_session_id WHERE co.account_entry_id=? AND co.guest_app_id=? AND co.stay_id=? LIMIT 1`,[entryId,session.id,session.stay_id]);
        const order=links[0]||null;let items=[];
        if(order?.module_type==="store")[items]=await db.query("SELECT title,variant_title,quantity,unit_price,total_price FROM tags_store_order_items WHERE order_id=? ORDER BY id",[order.external_order_id]);
        if(order?.module_type==="resto")[items]=await db.query("SELECT product_title title,variant_title,quantity,unit_price,total_price,notes FROM tags_resto_session_items WHERE session_id=? ORDER BY id",[order.external_session_id]);
        return Response.json({ok:true,entry,order,items});
    }
    const[entries]=await db.query(`SELECT e.id,e.entry_type,e.source_type,e.source_id,e.description,e.quantity,e.unit_amount,e.total_amount,e.currency,e.occurred_at,p.payment_method,p.reference FROM tags_guest_account_entries e LEFT JOIN tags_guest_payments p ON p.account_entry_id=e.id WHERE e.account_id=? AND e.status='confirmed' ORDER BY e.occurred_at,e.id`,[account.id]);
    const summary=entries.reduce((result,item)=>{const amount=Number(item.total_amount||0);if(item.entry_type==="payment")result.paid+=Math.abs(amount);else if(item.entry_type==="discount")result.discounts+=Math.abs(amount);else if(amount>0)result.charges+=amount;result.balance+=amount;return result},{charges:0,discounts:0,paid:0,balance:0});
    return Response.json({ok:true,account,entries,summary});
}
