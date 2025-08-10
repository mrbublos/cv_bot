import {BeamModelClient} from "./beamModelClient";
import {RunpodModelClient} from "./runpodModelClient";
import {ModalModelClient} from "./modalModelClient";

export function getModelClient() {
    return new ModalModelClient();
}