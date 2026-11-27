import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireOrganizationRole } from "@/lib/auth";

const MANAGERS=["owner","admin","election_manager"];
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request:NextRequest){
 const session=await getSession();
 if(!session)return NextResponse.json({error:"Authentication required."},{status:401});
 let body:any;try{body=await request.json();}catch{return NextResponse.json({error:"Invalid JSON body."},{status:400});}
 const electionId=typeof body.electionId==="string"?body.electionId:"";
 const raw=Array.isArray(body.emails)?body.emails:[];
 if(!electionId||raw.length===0||raw.length>500)return NextResponse.json({error:"Provide an electionId and up to 500 email addresses."},{status:400});
 const emails=[...new Set(raw.map((v:any)=>typeof v==="string"?v.trim().toLowerCase():"").filter((v:string)=>emailPattern.test(v)&&v.length<=254))];
 if(!emails.length)return NextResponse.json({error:"No valid email addresses were supplied."},{status:400});
 const election=await prisma.election.findUnique({where:{id:electionId}});
 if(!election)return NextResponse.json({error:"Election not found."},{status:404});
 try{await requireOrganizationRole(election.organizationId,MANAGERS);}catch(error){const message=error instanceof Error?error.message:"";return NextResponse.json({error:message==="UNAUTHENTICATED"?"Authentication required.":"Voter management permission required."},{status:message==="UNAUTHENTICATED"?401:403});}
 if(election.status==="open"||election.status==="closed")return NextResponse.json({error:"Voter lists are locked once an election opens."},{status:409});
 const existing=await prisma.voter.findMany({where:{electionId,email:{in:emails}},select:{email:true}});
 const existingSet=new Set(existing.map(v=>v.email));
 const fresh=emails.filter(e=>!existingSet.has(e));
 const invalidCount=raw.length-emails.length;
 const added=await prisma.$transaction(async tx=>{
  const result=await tx.voter.createMany({data:fresh.map(email=>({electionId,email})),skipDuplicates:true});
  if(result.count)await tx.auditEvent.create({data:{organizationId:election.organizationId,action:"voters.bulk_added",details:{electionId,addedCount:result.count,actorUserId:session.userId}}});
  return result.count;
 });
 return NextResponse.json({submitted:raw.length,validUnique:emails.length,added,duplicates:emails.length-fresh.length,invalid:invalidCount});
}
