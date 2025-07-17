import {BeamModelClient} from "./beamModelClient";
import {RunpodModelClient} from "./runpodModelClient";

export function getModelClient() {
    return new RunpodModelClient();
}