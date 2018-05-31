/**
 * Created by harsh on 21/12/16.
 */

import React,{propTypes} from 'react';
import _ from 'lodash';
import dhisAPIHelper from '../dhisAPIHelper';
import * as NIE from '../nie-constants';
import utility from '../utility-functions';
import moment from 'moment';

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
    function filterByEventDate (events,date){
        
        var results = [];
        
        for (var key in events){
            if (moment(events[key].eventDate) <= date){
                results.push(events[key]);
            }
        }
        
        return results;
    }

    var instance = Object.create(React.Component.prototype)
    
    instance.props = props
    instance.state = { data: props.data , cases : [] };

    instance.componentDidMount =  function() {        
        dhisAPIHelper.getClusterCases(props.data.cases, (cases) => {
            cases = utility.sortBy(cases,function(event){                
                return event.eventDate;
            });
            
            var showClusterIntensity = document.getElementById('showClusterIntensity').checked;
            var startDate = $('#edate').datepicker('getDate');


            if (!showClusterIntensity)
            cases = filterByEventDate(cases,moment(startDate));

            instance.setState({cases : cases , deMap : props.deMap, endDate:props.endDate, clusterIntensity:props.clusterIntensity, componentDidMount: instance.componentDidMount});
        })
    }
  
    instance.getClusterID = function(){
        if (!this.state.data.attributes){return ""}
        
        var id = utility.findValueAgainstId(this.state.data.attributes,"attribute",NIE.CLUSTER_TEA_CLUSTERID,"value");
	var cluster_id = id.split("_");
	if (cluster_id[1]){
	    id = cluster_id[0]+"_" + moment(cluster_id[1]).format("DD-MM-YYYY");
	}
	
        return id;
    }
    
    instance.clusterActivationToggle = function(data,isActive){    
      
        isActive = !isActive;
        dhisAPIHelper.saveTEIWithDataValue(data.trackedEntityInstance,NIE.TEA_IS_ACTIVE,isActive,(attributes) => {
          
            this.state.data.attributes = attributes;
            this.setState({data:this.state.data})
           
        });                
    }

    var isClusterActive = false;
    instance.render = function() {       
        var isActive =  utility.findValueAgainstId(this.state.data.attributes,"attribute",NIE.TEA_IS_ACTIVE,"value");   
        if (isActive == null || isActive == undefined){
            isActive = false;
        }
        isActive = JSON.parse(isActive);
        
	var clusterSize = this.state.data.cases.split(";").length-1;
        return  <div className='linelist '>
            is Active ? <input type='checkbox' value = "Activate/Deactivate" onChange={() => this.clusterActivationToggle(this.props.data,isActive)} checked = {isActive} />
	    <label>No of Cases : {clusterSize} </label>

            <b><a href={"../../../dhis-web-reporting/generateHtmlReport.action?uid=DnjzL5wPJE5&tei="+this.props.data.trackedEntityInstance } target="_blank" >{this.getClusterID()}</a></b>
            <br></br>
            <AlertTable data={this.state} />
            </div>            
    }
    
    return instance    
}

function AlertTable(props){

    function getHeaderRows(){

        if (!props.data.deMap){return}

        var tableHeaders = [];      
        tableHeaders.push(<th key={_.uniqueId("th_#")} > ## </th>);  
        tableHeaders.push(<th key={_.uniqueId("th_duplicate")} >isDuplicate</th>);
        
        for (var key in props.data.deMap ){
	    tableHeaders.push(<th key={_.uniqueId("th_")+"-"+props.data.deMap[key].id}>{props.data.deMap[key].name}</th>);
        }

	tableHeaders = utility.popupOrdering(tableHeaders,NIE.popupOrdering);

        return tableHeaders;
    }
    
    function toggleDuplicate(eventUID,currentValue){
                      
        var _currentValue = !(currentValue);
        
        dhisAPIHelper.saveEventWithDataValue(eventUID,NIE.DE_isDuplicate,_currentValue,() => {
            props.data.componentDidMount();
        });
        
        return currentValue;
    }
    
    function getRows(cases,clusterDeIdToNameMap){
        var rows = [];
        cases.map(function(eventCase,index){
            var isDuplicate =  utility.findValueAgainstId(eventCase.dataValues,"dataElement",NIE.DE_isDuplicate,"value");
            if (isDuplicate == null || isDuplicate == undefined){
                isDuplicate = false;
            }
            isDuplicate = JSON.parse(isDuplicate);

            var duplicateRowClass = '';
            var cells = [];
            var eventUID = eventCase.event;
            cells.push(<td key = {index+1}>
                       {index+1}
                       </td>)
            cells.push(
                    <td key = {eventCase.event+"-"+NIE.DE_isDuplicate}>
                    <input key = {"input_"+eventCase.event+"-"+NIE.DE_isDuplicate} type='checkbox' value='duplicate' onChange={ () => toggleDuplicate(eventUID,isDuplicate)} checked = {isDuplicate} >
                    </input>
                    </td>)
            
            for (var key in clusterDeIdToNameMap ){
                var value = utility.findValueAgainstId(eventCase.dataValues,"dataElement",key,"value");
                if (!value){value = ""};
                if (clusterDeIdToNameMap[key].valueType == "DATE"){
                    value = moment(value).format("DD-MM-YYYY");
                }
                if (clusterDeIdToNameMap[key].id =='IeAaU6tgIFl'){
 		    var temp = value.split("-");
 		    if (temp[1]){
 			value = temp[1]
 		    }
 		    
 		}
                cells.push(<td  key = {eventCase.event+"-"+key}>{value}</td>)
            }
            if (isDuplicate){
                duplicateRowClass = 'violet';
            }

	    cells = utility.popupOrdering(cells,NIE.popupOrdering);

            rows.push(<tr className = {duplicateRowClass} key = {eventCase.event}>{cells}</tr>);          
        })

        return rows;
    }
    
    return(
            <table className='alertsTable'>
            <thead>
            <tr>{getHeaderRows()}</tr>
            </thead>            
            <tbody>
            {getRows(props.data.cases,props.data.deMap)}
        </tbody>      
            </table>
    );    
}
