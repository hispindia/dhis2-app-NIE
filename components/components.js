/**
 * Created by harsh on 21/12/16.
 */

import React,{propTypes} from 'react';
import _ from 'lodash';

export function UploadFile(props){
        return (
                <div>
                    <label>Upload .json file</label>
                    <input type="file" id="fileInput"/>
                    <button onClick={props.onClick}>Import</button>
                </div>
            )
}

export function AlertPopUp(props){
return(
        <div>
        Hello
        
        </div>
);
}
export function MapContainer(){

}