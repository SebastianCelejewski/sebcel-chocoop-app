import vacuuming from "../assets/images/activities/v2/vacuuming_64x64.png?url";
import dishwashing from "../assets/images/activities/v2/dishwashing_64x64.png?url";
import shopping_local from "../assets/images/activities/v2/shopping_local_64x64.png?url";
import shopping_Auchan from "../assets/images/activities/v2/shopping_Auchan_64x64.png?url";
import cooking from "../assets/images/activities/v2/cooking_64x64.png?url";
import laundry_start from "../assets/images/activities/v2/laundry_start_64x64.png?url";
import laundry_end from "../assets/images/activities/v2/laundry_end_64x64.png?url";
import laundry_sorting from "../assets/images/activities/v2/laundry_sorting_64x64.png?url";
import taking_garbage_out from "../assets/images/activities/v2/taking_garbage_out_64x64.png?url";
import unpacking_frisco from "../assets/images/activities/v2/unpacking_frisco_64x64.png?url";
import cleaning_bathtube from "../assets/images/activities/v2/cleaning_bathtube_64x64.png?url";
import cleaning_toilet from  "../assets/images/activities/v2/cleaning_toilet_64x64.png?url";
import mopping from  "../assets/images/activities/v2/mopping_64x64.png?url";
import unloading_dishwasher from  "../assets/images/activities/v2/unloading_dishwasher_64x64.png?url";

function TemplateButtons({ fillTemplate }: { fillTemplate: (name: string, exp: number) => void }) {
    return <>
        <div className="templateActivities">
            <img src={vacuuming} data-testid="template-button" onClick={() => fillTemplate("odkurzanie", 10)} alt="odkurzanie"></img>
            <img src={mopping} data-testid="template-button" onClick={() => fillTemplate("mycie podłóg", 20)} alt="mycie podłóg"></img>
            <img src={dishwashing} data-testid="template-button" onClick={() => fillTemplate("zmywanie naczyń", 20)} alt="zmywanie naczyń"></img>
            <img src={unloading_dishwasher} data-testid="template-button" onClick={() => fillTemplate("rozładowanie zmywarki", 10)} alt="rozładowanie zmywarki"></img>
            <img src={shopping_local} data-testid="template-button" onClick={() => fillTemplate("zakupy osiedle", 10)} alt="zakupy osiedle"></img>
            <img src={shopping_Auchan} data-testid="template-button" onClick={() => fillTemplate("zakupy Auchan", 20)} alt="zakupy Auchan"></img>
            <img src={cooking} data-testid="template-button" onClick={() => fillTemplate("ugotowanie obiadu", 40)} alt="ugotowanie obiadu"></img>
        </div>
        <div className="templateActivities">
            <img src={laundry_start} data-testid="template-button" onClick={() => fillTemplate("nastawianie prania", 10)} alt="nastawianie prania"></img>
            <img src={laundry_end} data-testid="template-button" onClick={() => fillTemplate("wywieszanie prania", 10)} alt="wywieszanie prania"></img>
            <img src={laundry_sorting} data-testid="template-button" onClick={() => fillTemplate("ściąganie prania", 10)} alt="ściąganie prania"></img>
            <img src={cleaning_bathtube} data-testid="template-button" onClick={() => fillTemplate("szorowanie wanny", 40)} alt="szorowanie wanny"></img>
            <img src={cleaning_toilet} data-testid="template-button" onClick={() => fillTemplate("szorowanie sedesu", 40)} alt="szorowanie sedesu"></img>
            <img src={taking_garbage_out} data-testid="template-button" onClick={() => fillTemplate("wyniesienie śmieci", 10)} alt="wyniesienie śmieci"></img>
            <img src={unpacking_frisco} data-testid="template-button" onClick={() => fillTemplate("rozpakowanie zakupów Frisco", 5)} alt="rozpakowanie zakupów Frisco"></img>
        </div>
    </>
}

export default TemplateButtons;