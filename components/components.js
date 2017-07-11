/**
 * Created by harsh on 21/12/16.
 */

import React,{propTypes} from 'react';
import _ from 'lodash';
import dhisAPIHelper from '../dhisAPIHelper';
import * as NIE from '../nie-constants';
import utility from '../utility-functions';
import ajax from '../ajax-wrapper'

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
        
        dhisAPIHelper.getCluster(props.data.uid,function(error,response,body){
            if (error){
                console.log("Get Cluster Error");
                return
            }
            instance.state.data.cluster = response;
            instance.setState({data:instance.state.data})
        });
        
        dhisAPIHelper.getClusterCases(props.data.keys,(cases) => {
            instance.setState({cases : cases , deMap : props.deMap, componentDidMount: instance.componentDidMount});
        })
    }
  
    instance.getClusterID = function(){
        

        if (!this.state.data.cluster){return ""}

        var id = utility.findValueAgainstId(this.state.data.cluster.attributes,"attribute",NIE.CLUSTER_TEA_CLUSTERID,"value")
        return "ClusterID :"+id;
    }
    
    instance.approveAndSave = function(state){    
       
        dhisAPIHelper.saveCluster(state,(error,message,cluster) => {
            alert(message);
            if (!error){ // send Cluster Information Report 
                ajax.request({
                    type: "GET",
                    async: true,
                    contentType: "text/plain",
                    url: NIE.Node_Service_URL+"sendClusterInformationReport?ou="+cluster.orgUnit+"&tei="+cluster.trackedEntityInstance+"&name="+cluster.trackedEntityInstance+".pdf"
                }, function (error, response, body) {
                    
                    
                })
                this.state.data.cluster = cluster;
                this.setState({data:this.state.data})
                
            };                
        })
    }
    
    var isClusterActive = false;
    instance.render = function() {       
        
        return  <div className='linelist '> <input key = {"input_save"} type='button' value='Approve and Save' onClick={ () => this.approveAndSave(this.state)}  />
            {this.getClusterID()}
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
        tableHeaders.push(<th key={_.uniqueId("th_")} >isDuplicate</th>);
        
        for (var key in props.data.deMap ){
            tableHeaders.push(<th key={_.uniqueId("th_")}>{props.data.deMap[key].name}</th>);
        }
        
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
                    <td key = {eventCase.event+"-"+NIE.DE_isDuplicate}>
                    <input key = {"input_"+eventCase.event+"-"+NIE.DE_isDuplicate} type='checkbox' value='duplicate' onChange={ () => toggleDuplicate(eventUID,isDuplicate)} checked = {isDuplicate} >
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
