FROM ubuntu:18.04
RUN apt-get update
RUN apt-get -y upgrade
RUN apt-get install -y tzdata
# work arround of non intaractive install 
RUN apt-get update
RUN apt-get install -y sudo curl gnupg gnupg2 gnupg1 git build-essential software-properties-common openssh-server supervisor vim npm
RUN npm install -g n
RUN n v15.6.0

# install go
RUN sudo add-apt-repository ppa:longsleep/golang-backports
RUN apt-get update
RUN apt-get install -y golang-go

# setup ssh
RUN mkdir /var/run/sshd
RUN echo 'root:root' | chpasswd
RUN sed -ri 's/^#?PermitRootLogin\s+.*/PermitRootLogin yes/' /etc/ssh/sshd_config
RUN sed -ri 's/^#?Port\s+.*/Port 222/' /etc/ssh/sshd_config

# SSH login fix. Otherwise user is kicked off after login
RUN sed 's@session\s*required\s*pam_loginuid.so@session optional pam_loginuid.so@g' -i /etc/pam.d/sshd

#ENV NOTVISIBLE "in users profile"
RUN echo "export VISIBLE=now" >> /etc/profile

# setup supervisrod
RUN mkdir /var/log/hornet
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# install hornet
WORKDIR /app
RUN git clone https://github.com/gohornet/hornet.git
RUN cd hornet;./scripts/build_hornet.sh
COPY config.json /app/hornet/config.json
ARG HORNETADDRESS
RUN echo ${HORNETADDRESS}
RUN sed -e "s/HOSTADDRESS/$HORNETADDRESS/" -i /app/hornet/config.json
COPY snapshot.csv /app/hornet/snapshot.csv

EXPOSE 8081 14265 14626 15600 222 4001
CMD ["/usr/bin/supervisord"]