/**
 * Created by harsh on 21/12/16.
 */

import React,{propTypes} from 'react';
import _ from 'lodash';
import dhisAPIHelper from '../dhisAPIHelper';
import * as NIE from '../nie-constants';
import utility from '../utility-functions';

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
    
    var instance = Object.create(React.Component.prototype)

    instance.props = props
    instance.state = { data: props.data , cases : [] };

    instance.componentDidMount =  function() {        
        dhisAPIHelper.getClusterCases(props.data.cases,(cases) => {
            instance.setState({cases : cases , deMap : props.deMap, componentDidMount: instance.componentDidMount});
        })
    }
  
    instance.clusterActivationToggle = function(e){
        debugger
    }

    instance.render = function() {          
        return  <div className='linelist'>
            <input type='checkbox' value = "Activate/Deactivate" onChange={this.clusterActivationToggle}  /> <br></br>
            <AlertTable data={this.state} />
            </div>            
    }
    
    return instance    
}

function AlertTable(props){

    function callIt(){
        props.data.componentDidMount();
    }
    function getHeaderRows(){

        if (!props.data.deMap){return}

        var tableHeaders = [];        
        tableHeaders.push(<th key={_.uniqueId("th_")} >isDuplicate</th>);
        
        for (var key in props.data.deMap ){
            tableHeaders.push(<th key={_.uniqueId("th_")}>{props.data.deMap[key].name}</th>);
        }
        
        return tableHeaders;
    }
    
    function toggleDuplicate(eventUID,currentValue){
                      
        var _currentValue = !(currentValue);
        
        dhisAPIHelper.saveEventWithDataValue(eventUID,NIE.DE_isDuplicate,_currentValue,() => {
            callIt();
        });
        
        return currentValue;
    }
    
    function getRows(cases,clusterDeIdToNameMap){
        var rows = [];
        cases.map(function(eventCase){
            var isDuplicate =  utility.findValueAgainstId(eventCase.dataValues,"dataElement",NIE.DE_isDuplicate,"value");
            if (isDuplicate == null || isDuplicate == undefined){
                isDuplicate = false;
            }
            isDuplicate = JSON.parse(isDuplicate);

            var duplicateRowClass = '';
            var cells = [];
            var eventUID = eventCase.event;
            cells.push(
                    <td  key = {eventCase.event+"-"+NIE.DE_isDuplicate}>
                    <input  key = {"input_"+eventCase.event+"-"+NIE.DE_isDuplicate} type='checkbox' value='duplicate' onChange={ () => toggleDuplicate(eventUID,isDuplicate)} checked = {isDuplicate} >
                    </input>
                    </td>)
            
            for (var key in clusterDeIdToNameMap ){
                var value = utility.findValueAgainstId(eventCase.dataValues,"dataElement",key,"value");
                if (!value){value = ""};
                cells.push(<td  key = {eventCase.event+"-"+key}>{value}</td>)
            }
            if (isDuplicate){
                duplicateRowClass = 'violet';
            }
            rows.push(<tr className = {duplicateRowClass} key = {eventCase.event}>{cells}</tr>);          
        })

        return rows;
    }
    
    return(
            <table className='listTable'>
            <thead>
            <tr>{getHeaderRows()}</tr>
            </thead>            
            <tbody>
            {getRows(props.data.cases,props.data.deMap)}
        </tbody>      
            </table>
    );    
}
