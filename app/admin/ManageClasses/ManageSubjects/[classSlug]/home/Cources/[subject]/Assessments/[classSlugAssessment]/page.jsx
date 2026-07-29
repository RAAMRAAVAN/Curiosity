"use client";
import AssessmentManager from "@/app/(components)/AssessmentManager";
import { useParams, usePathname } from "next/navigation";
const Assessments = () => {
    const pathname = usePathname();
    const params = useParams();
    const classSlugAssessment = params?.classSlugAssessment;
    console.log("Class ID", classSlugAssessment)
    return(<>
    <AssessmentManager subjectId="cms4x845e0002vd60nnv89wni" classId={classSlugAssessment}/>
    </>);
}
export default Assessments;